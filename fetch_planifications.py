#!/usr/bin/env python3
"""Script to fetch all planifications from the last 60 days and upsert streets to Supabase"""
from datetime import datetime
from typing import Optional, Dict, Any
import os
import json
import zeep
from dotenv import load_dotenv
from supabase import create_client
from shapely.geometry import LineString
import psycopg2
from psycopg2.extras import Json as PGJson
import requests

# Load environment variables from .env file
load_dotenv()

DEFAULT_URL = ('https://servicesenligne2.ville.montreal.qc.ca/api/infoneige/InfoneigeWebService?WSDL')

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Upsert will be skipped.")


def geojson_to_wkt(geometry):
    if geometry["type"] != "LineString":
        return None
    return LineString(geometry["coordinates"]).wkt


def convert_datetime_to_string(obj):
    """Recursively convert datetime objects to ISO format strings"""
    if isinstance(obj, datetime):
        return obj.replace(microsecond=0).isoformat()
    elif isinstance(obj, dict):
        return {key: convert_datetime_to_string(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_string(item) for item in obj]
    return obj


class PlanifNeigeClient:
    """Client class for the PlanifNeige API"""
    
    def __init__(self, token: str, url: str = None):
        self.transport = zeep.Transport()
        self.transport.session.headers['User-Agent'] = (
            "planif-neige-client https://github.com/poboisvert"
        )
        
        if url is None:
            url = DEFAULT_URL
        self.wsdl = url
        self.client = zeep.Client(wsdl=self.wsdl, transport=self.transport)
        self.token = token
    
    def get_planification_for_date(self, from_date: str = None):
        """Get planification data from API for all streets since a specified date"""
        if from_date is None:
            raise ValueError("from_date parameter is required")

        request = {'fromDate': str(from_date), 'tokenString': self.token}
        response = self.client.service.GetPlanificationsForDate(request)
        result = zeep.helpers.serialize_object(response)

        try:
            # Save raw API result to a file for inspection
            with open("planifications_raw_result.json", "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
        except:
            print("ERROR")
        status = result.get('responseStatus', -1)
        if status != 0:
            raise Exception(f"API returned status code: {status}")
        
        planifications = result.get('planifications', {})
        planification_list = planifications.get('planification', [])
        
        # If single item, convert to list
        if isinstance(planification_list, dict):
            planification_list = [planification_list]
        
        # Convert datetime objects to strings
        planification_list = convert_datetime_to_string(planification_list)
        
        return planification_list


def get_etat_deneig_status(etat: int) -> str:
    """Convert etatDeneig number to human-readable status string"""
    status_map = {
        0: "Enneigé",
        1: "Déneigé",
        2: "Planifié",
        3: "Replanifié",
        4: "Sera replanifié ultérieurement",
        5: "Chargement en cours",
        10: "Dégagé (entre 2 chargements de neige)"
    }
    return status_map.get(etat, f"État inconnu ({etat})")


def get_current_state(cote_rue_id: int) -> Optional[Dict[str, Any]]:
    """Get the current state from deneigement_current table"""
    if supabase is None:
        return None
    
    try:
        res = supabase.table("deneigement_current") \
            .select("*") \
            .eq("cote_rue_id", cote_rue_id) \
            .single() \
            .execute()
        return res.data
    except Exception:
        # If no record found, single() will raise an exception
        # Return None to indicate no current state
        return None


def insert_event(cote_rue_id: int, old: Optional[Dict[str, Any]], new: Dict[str, Any]):
    """Insert an event into deneigement_events table when state changes"""
    if supabase is None:
        return
    
    event = {
        "cote_rue_id": cote_rue_id,
        "old_etat": old["etat_deneig"] if old else None,
        "new_etat": new["etatDeneig"],
        "old_status": old["status"] if old else None,
        "new_status": new["status"],
        "event_date": new["dateMaj"]
    }
    
    try:
        supabase.table("deneigement_events").insert(event).execute()
    except Exception as e:
        print(f"Error inserting event for cote_rue_id {cote_rue_id}: {str(e)}")


def upsert_current(item: Dict[str, Any]):
    """Upsert current state and track events when state changes"""
    if supabase is None:
        return
    
    cote_rue_id = item.get("coteRueId")
    if not cote_rue_id:
        return
    
    current = get_current_state(cote_rue_id)
    
    # Check if state has changed
    has_changed = (
        current is None or
        current.get("etat_deneig") != item.get("etatDeneig") 
    )
    
    if has_changed:
        insert_event(cote_rue_id, current, item)
    
    record = {
        "cote_rue_id": cote_rue_id,
        "etat_deneig": item.get("etatDeneig"),
        "status": item.get("status"),
        "date_debut_planif": item.get("dateDebutPlanif"),
        "date_fin_planif": item.get("dateFinPlanif"),
        "date_debut_replanif": item.get("dateDebutReplanif"),
        "date_fin_replanif": item.get("dateFinReplanif"),
        "date_maj": item.get("dateMaj")
    }
    
    # Remove None values
    record = {k: v for k, v in record.items() if v is not None}
    
    try:
        supabase.table("deneigement_current").upsert(record, on_conflict="cote_rue_id").execute()
    except Exception as e:
        print(f"Error upserting current state for cote_rue_id {cote_rue_id}: {str(e)}")


def ingest(api_response: list, gbdouble_mapping: Dict[int, Dict[str, Any]] = None, db_conn=None):
    """
    Process API response and upsert both streets and current states.
    
    Args:
        api_response: List of planification items from the API
        gbdouble_mapping: Optional mapping of cote_rue_id to GeoJSON features
        db_conn: Optional database connection for PostGIS support
    """
    upserted_streets_count = 0
    skipped_streets_count = 0
    upserted_current_count = 0
    # https://donnees.montreal.ca/dataset/geobase-double/resource/16f7fa0a-9ce6-4b29-a7fc-00842c593927
    
    for item in api_response:
        cote_rue_id = item.get('coteRueId')
        
        # Add human-readable status to planification
        etat_deneig = item.get('etatDeneig')
        item['status'] = get_etat_deneig_status(etat_deneig) if etat_deneig is not None else "État inconnu"
        
        # Upsert street feature if available
        if cote_rue_id and gbdouble_mapping and cote_rue_id in gbdouble_mapping:
            feature = gbdouble_mapping[cote_rue_id]
            result = upsert_street(feature, db_conn)
            
            if result:
                upserted_streets_count += 1
                print(f"✓ Upserted street: cote_rue_id={cote_rue_id}, status={item['status']}")
            else:
                skipped_streets_count += 1
                print(f"✗ Failed to upsert street: cote_rue_id={cote_rue_id}")
        else:
            if cote_rue_id:
                skipped_streets_count += 1
                if gbdouble_mapping is None:
                    print(f"⚠ Skipped street: No gbdouble mapping available for coteRueId={cote_rue_id}")
                else:
                    print(f"⚠ Skipped street: No matching feature for coteRueId={cote_rue_id}")
        
        # Upsert current state and track events
        if cote_rue_id:
            try:
                upsert_current(item)
                upserted_current_count += 1
                print(f"✓ Updated current state: cote_rue_id={cote_rue_id}, status={item['status']}")
            except Exception as e:
                print(f"✗ Failed to upsert current state for cote_rue_id={cote_rue_id}: {str(e)}")
    
    return {
        "total": len(api_response),
        "streets_upserted": upserted_streets_count,
        "streets_skipped": skipped_streets_count,
        "current_upserted": upserted_current_count
    }


def upsert_street(feature: Dict[str, Any], db_conn=None) -> Optional[Dict[str, Any]]:
    """
    Upsert a street feature into the Supabase streets table.
    
    Args:
        feature: GeoJSON feature object with properties and geometry
        db_conn: Optional psycopg2 connection for direct database access
    
    Returns:
        True if successful, False otherwise
    """
    if supabase is None and db_conn is None:
        return None
    
    properties = feature.get("properties", {})
    cote_rue_id = properties.get("COTE_RUE_ID")
    
    if cote_rue_id is None:
        return None
    geom = feature["geometry"]

    # Extract fields from properties (matching table column names)
    street_data = {
        "cote_rue_id": cote_rue_id,
        "id_trc": properties.get("ID_TRC"),
        "id_voie": properties.get("ID_VOIE"),
        "nom_voie": properties.get("NOM_VOIE"),
        "nom_ville": properties.get("NOM_VILLE"),
        "debut_adresse": properties.get("DEBUT_ADRESSE"),
        "fin_adresse": properties.get("FIN_ADRESSE"),
        "cote": properties.get("COTE"),
        "type_f": properties.get("TYPE_F"),
        "sens_cir": properties.get("SENS_CIR"),
        "geometry": f"SRID=4326;{geojson_to_wkt(geom)}",
        "street_feature": PGJson(feature),  # Store the entire feature as jsonb
    }
    geometry = feature.get("geometry")
    
    try:
        if db_conn:
            # Use direct psycopg2 connection for proper PostGIS support
            with db_conn.cursor() as cur:
                # Build the upsert query with PostGIS geometry
                if geometry:
                    # Convert GeoJSON to PostGIS geography
                    cur.execute("""
                        INSERT INTO streets (
                            cote_rue_id, id_trc, id_voie, nom_voie, nom_ville,
                            debut_adresse, fin_adresse, cote, type_f, sens_cir,
                            geometry, street_feature, updated_at
                        ) VALUES (
                            %(cote_rue_id)s, %(id_trc)s, %(id_voie)s, %(nom_voie)s, %(nom_ville)s,
                            %(debut_adresse)s, %(fin_adresse)s, %(cote)s, %(type_f)s, %(sens_cir)s,
                            ST_GeomFromGeoJSON(%(geometry)s)::geography, %(street_feature)s, now()
                        )
                        ON CONFLICT (cote_rue_id) DO UPDATE SET
                            id_trc = EXCLUDED.id_trc,
                            id_voie = EXCLUDED.id_voie,
                            nom_voie = EXCLUDED.nom_voie,
                            nom_ville = EXCLUDED.nom_ville,
                            debut_adresse = EXCLUDED.debut_adresse,
                            fin_adresse = EXCLUDED.fin_adresse,
                            cote = EXCLUDED.cote,
                            type_f = EXCLUDED.type_f,
                            sens_cir = EXCLUDED.sens_cir,
                            geometry = EXCLUDED.geometry,
                            street_feature = EXCLUDED.street_feature,
                            updated_at = now()
                    """, {
                        **street_data,
                        'geometry': json.dumps(geometry)
                    })
                else:
                    # Upsert without geometry
                    cur.execute("""
                        INSERT INTO streets (
                            cote_rue_id, id_trc, id_voie, nom_voie, nom_ville,
                            debut_adresse, fin_adresse, cote, type_f, sens_cir,
                            street_feature, updated_at
                        ) VALUES (
                            %(cote_rue_id)s, %(id_trc)s, %(id_voie)s, %(nom_voie)s, %(nom_ville)s,
                            %(debut_adresse)s, %(fin_adresse)s, %(cote)s, %(type_f)s, %(sens_cir)s,
                            %(street_feature)s, now()
                        )
                        ON CONFLICT (cote_rue_id) DO UPDATE SET
                            id_trc = EXCLUDED.id_trc,
                            id_voie = EXCLUDED.id_voie,
                            nom_voie = EXCLUDED.nom_voie,
                            nom_ville = EXCLUDED.nom_ville,
                            debut_adresse = EXCLUDED.debut_adresse,
                            fin_adresse = EXCLUDED.fin_adresse,
                            cote = EXCLUDED.cote,
                            type_f = EXCLUDED.type_f,
                            sens_cir = EXCLUDED.sens_cir,
                            street_feature = EXCLUDED.street_feature,
                            updated_at = now()
                    """, street_data)
                db_conn.commit()
                return True
        else:
            # Fallback to Supabase client (without geometry for now)
            # Remove None values
            street_data_clean = {k: v for k, v in street_data.items() if v is not None and k != 'street_feature'}
            street_data_clean['street_feature'] = feature
            
            result = supabase.table("streets").upsert(
                street_data_clean,
                on_conflict="cote_rue_id"
            ).execute()
            
            return result.data is not None
    except Exception as e:
        print(f"Error upserting street {cote_rue_id}: {str(e)}")
        if db_conn:
            db_conn.rollback()
        return False


def main():
    """Main function to fetch planifications and upsert streets to Supabase"""
    # Get token from environment
    token = os.getenv("TokenString") or os.getenv("PLANIF_NEIGE_TOKEN", "")
    if not token:
        print("ERROR: TokenString or PLANIF_NEIGE_TOKEN not set in .env file or environment")
        return 1
    
    # Check Supabase configuration
    if supabase is None:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env file")
        return 1
    
    # Initialize client
    client = PlanifNeigeClient(token)
    
    # Use 60 days ago to get all recent planifications
    from_date = datetime.now().replace(microsecond=0, second=0, minute=0).isoformat()
    print(f"Fetching planifications from date: {from_date}")
    print("=" * 80)
    
    # Load gbdouble.json to get street features
    gbdouble_mapping = {}
    try:
        # https://donnees.montreal.ca/dataset/geobase-double
        gbdouble_url = "https://donnees.montreal.ca/dataset/88493b16-220f-4709-b57b-1ea57c5ba405/resource/16f7fa0a-9ce6-4b29-a7fc-00842c593927/download/gbdouble.json"
        print("Downloading the latest gbdouble.json...")

        try:
            response = requests.get(gbdouble_url)
            response.raise_for_status()
            geojson_data = response.json()
            print("Successfully downloaded latest gbdouble.json")
        except Exception as e:
            print(f"ERROR: Failed to download gbdouble.json: {e}")
            return 1
        
        features = geojson_data.get("features", [])
        for feature in features:
            properties = feature.get("properties", {})
            cote_rue_id = properties.get("COTE_RUE_ID")
            if cote_rue_id is not None:
                gbdouble_mapping[cote_rue_id] = feature
        
        print(f"Loaded {len(gbdouble_mapping)} features from gbdouble.json")
    except FileNotFoundError:
        print("ERROR: gbdouble.json not found.")
        return 1
    except Exception as e:
        print(f"ERROR: Error loading gbdouble.json: {str(e)}")
        return 1
    
    # Try to establish direct database connection for PostGIS support
    db_conn = None
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if database_url:
        try:
            # Parse connection string if needed
            db_conn = psycopg2.connect(database_url)
            print("Connected to database directly for PostGIS support")
        except Exception as e:
            print(f"Warning: Could not connect to database directly: {e}")
            print("Will use Supabase client (geometry may not be supported)")
    
    try:
        # Get all planifications
        planifications = client.get_planification_for_date(from_date)
        
        print(f"\nFound {len(planifications)} planification(s)")
        print("Processing planifications...\n")
        
        # Ingest all planifications
        summary = ingest(planifications, gbdouble_mapping, db_conn)
        
        print("\n" + "=" * 80)
        print(f"Summary:")
        print(f"  Total planifications: {summary['total']}")
        print(f"  Streets upserted: {summary['streets_upserted']}")
        print(f"  Streets skipped: {summary['streets_skipped']}")
        print(f"  Current states upserted: {summary['current_upserted']}")
        print("=" * 80)
        
        if db_conn:
            db_conn.close()
        
        return 0
        
    except Exception as e:
        print(f"ERROR: Failed to fetch planifications: {str(e)}")
        if db_conn:
            db_conn.close()
        return 1


if __name__ == "__main__":
    exit(main())


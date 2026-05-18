"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentControl } from "@/components/ui/segment-control";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Snowflake,
  RefreshCw,
  Search,
  User,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  ChevronUp,
  Car,
  Navigation,
  Layers,
  Heart,
  Construction,
  Upload,
} from "lucide-react";
import {
  supabase,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from "@/lib/auth";
import { searchAddress, type GeocodingResult } from "@/lib/geocoding";
import { getEtatDeneigColor, getEtatDeneigStatus } from "@/lib/constants";
import {
  findNearestStreetPlanification,
  getStreetLabelFromPlanification,
} from "@/lib/geo";
import { AuthModal } from "@/components/auth-modal";
import { MotionPermissionBanner } from "@/components/motion-permission-banner";
import { useImpactDetection } from "@/hooks/use-impact-detection";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const SnowMap = dynamic(() => import("@/components/map"), {
  ssr: false,
});

type MapIncident = {
  id: string;
  cote_rue_id: number;
  type: string;
  photo_url: string | null;
  priority: "low" | "medium" | "high";
  is_approved: boolean;
  created_at: string;
};

const INCIDENT_PRIORITY_LABELS: Record<MapIncident["priority"], string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

/** Set when a sponsor image URL is available; null shows meme fallback. */
const SPONSOR_AD: { imageUrl: string; href?: string; label?: string } | null =
  null;

const NO_SPONSOR_MEMES = [
  {
    src: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWxkZWh5aW8yNzZwYjhrZnA5a3gydnUxNGowNWd2Y3p4MW95bnpmbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WRQBXSCnEFJIuxktnw/giphy.gif",
    alt: "Cheems vibing",
    caption: "Pas de pub. Que des vibes.",
  },
  {
    src: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExenVmdGJsMmZoNG0xdzN1M3dqYTUyYWlvdDN6MzJ2dGYwZ210NGhpMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IzBpqKzHLtfTa/giphy.gif",
    alt: "Deal with it sunglasses",
    caption: "Deal with it — sponsor introuvable",
  },
  {
    src: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    alt: "Dance meme",
    caption: "En attendant un vrai sponsor…",
  },
] as const;

export default function MapApp() {
  const [planifications, setPlanifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Start as true to prevent empty state
  const [hasInitialBounds, setHasInitialBounds] = useState(false);
  const hasInitialBoundsRef = useRef(false);
  const [currentBounds, setCurrentBounds] = useState<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);
  const [selectedPlanif, setSelectedPlanif] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<
    "all" | "favorites" | "incidents"
  >("all");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [darkMode, setDarkMode] = useState(true);
  const [memeIndex, setMemeIndex] = useState(() =>
    Math.floor(Math.random() * NO_SPONSOR_MEMES.length),
  );
  const [searchLocation, setSearchLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [initialCenter, setInitialCenter] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  }>({ lat: 45.5019, lng: -73.5674, zoom: 18 });
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodingResult[]>(
    [],
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [zoomTrigger, setZoomTrigger] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCollapsed, setNotificationCollapsed] = useState(false);
  const [parkingLocations, setParkingLocations] = useState<any[]>([]);
  const [showParkingDialog, setShowParkingDialog] = useState(false);
  const [clickedParkingLocation, setClickedParkingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [parkingName, setParkingName] = useState("");
  const [parkingNotes, setParkingNotes] = useState("");
  const [parkingModeEnabled, setParkingModeEnabled] = useState(false);
  const [selectedParkingLocationId, setSelectedParkingLocationId] = useState<
    string | null
  >(null);
  const [showParkingMessage, setShowParkingMessage] = useState(false);
  const [showStackMenu, setShowStackMenu] = useState(false);
  const [municipalParkingEnabled, setMunicipalParkingEnabled] = useState(false);
  const [municipalParking, setMunicipalParking] = useState<any[]>([]);
  const [showMunicipalParkingMessage, setShowMunicipalParkingMessage] =
    useState(false);
  const [potholeModeEnabled, setPotholeModeEnabled] = useState(false);
  const [showPotholeMessage, setShowPotholeMessage] = useState(false);
  const [showPotholeDialog, setShowPotholeDialog] = useState(false);
  const [selectedIncidentCoteRueId, setSelectedIncidentCoteRueId] = useState<
    number | null
  >(null);
  const [selectedIncidentStreetLabel, setSelectedIncidentStreetLabel] =
    useState<string | null>(null);
  const [clickedIncidentLocation, setClickedIncidentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [potholePriority, setPotholePriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [potholePhoto, setPotholePhoto] = useState<File | null>(null);
  const [potholePhotoPreview, setPotholePhotoPreview] = useState<string | null>(
    null,
  );
  const [potholeSaving, setPotholeSaving] = useState(false);
  const potholePhotoInputRef = useRef<HTMLInputElement>(null);
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [showIncidentsListDialog, setShowIncidentsListDialog] = useState(false);
  const [listIncidentsCoteRueId, setListIncidentsCoteRueId] = useState<
    number | null
  >(null);
  const [listIncidentsStreetLabel, setListIncidentsStreetLabel] = useState<
    string | null
  >(null);
  const [reopenIncidentsListAfterReport, setReopenIncidentsListAfterReport] =
    useState(false);

  const {
    impactDetected,
    clearImpact,
    requestPermission,
    permissionState,
    isSupported: motionSupported,
  } = useImpactDetection();

  useLayoutEffect(() => {
    if (!impactDetected) return;
    clearImpact();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const nearest = findNearestStreetPlanification(
        lat,
        lng,
        mergedPlanifications,
      );
      if (!nearest) return;
      openIncidentReportDialog(
        nearest.planification.coteRueId,
        getStreetLabelFromPlanification(nearest.planification),
        { lat, lng },
      );
      setPotholePriority("high");
    });
    // mergedPlanifications intentionally omitted — we want the value at impact time,
    // not a new effect run on every map pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactDetected]);

  const resetPotholeForm = () => {
    setSelectedIncidentCoteRueId(null);
    setSelectedIncidentStreetLabel(null);
    setClickedIncidentLocation(null);
    setPotholePriority("medium");
    setPotholePhoto(null);
    if (potholePhotoPreview) {
      URL.revokeObjectURL(potholePhotoPreview);
    }
    setPotholePhotoPreview(null);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSearchLocation({
          lat: latitude,
          lng: longitude,
          zoom: 18,
        });
        setShowStackMenu(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(
          "Unable to retrieve your location. Please enable location services.",
        );
      },
    );
  };

  const loadSnowPlanning = useCallback(
    async (
      forceRefresh = false,
      bounds?: {
        minLat: number;
        minLng: number;
        maxLat: number;
        maxLng: number;
      },
    ) => {
      setLoading(true);
      try {
        let url = "/api/streets?include_snow=true";

        // Add bounding box parameters if provided
        if (bounds) {
          url += `&minLat=${bounds.minLat}&minLng=${bounds.minLng}&maxLat=${bounds.maxLat}&maxLng=${bounds.maxLng}`;
        }

        const response = await fetch(url, {
          cache: forceRefresh ? "no-store" : "default",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch snow planning data");
        }

        const result = await response.json();

        if (result.success && result.data) {
          const transformedData = result.data
            .filter(
              (street: any) =>
                street.deneigement_current && street.street_feature?.geometry,
            )
            .map((street: any) => ({
              munid: 66023,
              coteRueId: street.cote_rue_id,
              etatDeneig: street.deneigement_current.etat_deneig,
              status: street.deneigement_current.status,
              dateDebutPlanif: street.deneigement_current.date_debut_planif,
              dateFinPlanif: street.deneigement_current.date_fin_planif,
              dateDebutReplanif: street.deneigement_current.date_debut_replanif,
              dateFinReplanif: street.deneigement_current.date_fin_replanif,
              dateMaj: street.deneigement_current.date_maj,
              streetFeature: street.street_feature,
            }));

          // If bounds are provided, replace with only the data from the API (viewport data)
          // Otherwise, replace all data (initial load)
          setPlanifications(transformedData);
        }
      } catch (error) {
        console.error("Error loading snow planning:", error);
      } finally {
        // Only set loading to false if we have initial bounds (data has been loaded at least once)
        // This prevents showing empty state before map triggers initial bounds
        // Use ref to avoid closure issues with state
        if (hasInitialBoundsRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const handleBoundsChange = useCallback(
    (bounds: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
    }) => {
      if (!hasInitialBoundsRef.current) {
        hasInitialBoundsRef.current = true;
        setHasInitialBounds(true);
      }
      setCurrentBounds(bounds);
      loadSnowPlanning(false, bounds);
    },
    [loadSnowPlanning],
  );

  const loadFavorites = async () => {
    if (!user) {
      setFavorites(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("cote_rue_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading favorites:", error);
        throw error;
      }

      const favoriteIds = new Set(data?.map((f) => f.cote_rue_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  // Load favorite planifications with full street data
  const loadFavoritePlanifications = useCallback(async () => {
    if (!user || favorites.size === 0) {
      return [];
    }

    try {
      const favoriteIds = Array.from(favorites);

      const { data, error } = await supabase
        .from("streets")
        .select(
          `*,
          deneigement_current (
            etat_deneig,
            status,
            date_debut_planif,
            date_fin_planif,
            date_debut_replanif,
            date_fin_replanif,
            date_maj
          )`,
        )
        .in("cote_rue_id", favoriteIds);

      if (error) {
        console.error("Error loading favorite planifications:", error);
        throw error;
      }

      if (!data) return [];

      return data
        .filter(
          (street: any) =>
            street.deneigement_current && street.street_feature?.geometry,
        )
        .map((street: any) => ({
          munid: 66023,
          coteRueId: street.cote_rue_id,
          etatDeneig: street.deneigement_current.etat_deneig,
          status: street.deneigement_current.status,
          dateDebutPlanif: street.deneigement_current.date_debut_planif,
          dateFinPlanif: street.deneigement_current.date_fin_planif,
          dateDebutReplanif: street.deneigement_current.date_debut_replanif,
          dateFinReplanif: street.deneigement_current.date_fin_replanif,
          dateMaj: street.deneigement_current.date_maj,
          streetFeature: street.street_feature,
          isFavorite: true, // Mark as favorite
        }));
    } catch (error) {
      console.error("Error loading favorite planifications:", error);
      return [];
    }
  }, [user, favorites]);

  const toggleFavorite = async (coteRueId: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (favorites.has(coteRueId)) {
        // Remove from favorites
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("cote_rue_id", coteRueId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error removing favorite:", error);
          throw error;
        }

        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(coteRueId);
          return newSet;
        });
      } else {
        // Add to favorites
        const { error } = await supabase.from("user_favorites").insert({
          cote_rue_id: coteRueId,
          user_id: user.id,
        });

        if (error) {
          console.error("Error adding favorite:", error);
          // Check if it's a duplicate key error (already favorited)
          if (error.code === "23505") {
            // Already exists, just update local state
            setFavorites((prev) => new Set(prev).add(coteRueId));
            return;
          }
          throw error;
        }

        setFavorites((prev) => new Set(prev).add(coteRueId));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Optionally show a toast notification to the user
    }
  };

  const handleAvatarClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowUserMenu(!showUserMenu);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setFavorites(new Set());
    setShowUserMenu(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      setUser(user);
    };

    checkUser();

    const subscription = onAuthStateChange((user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't load all data initially - wait for map bounds to load viewport data
  // This prevents showing 0 → 5000 → correct count flicker
  // The map will trigger handleBoundsChange once initialized (via MapBoundsTracker)
  // We skip the initial load since enableDynamicFetching is true

  const loadIncidents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          "id, cote_rue_id, type, photo_url, priority, is_approved, created_at",
        )
        .eq("is_banned", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading incidents:", error);
        throw error;
      }

      setIncidents((data as MapIncident[]) || []);
    } catch (error) {
      console.error("Error loading incidents:", error);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    loadParkingLocations();
    loadMunicipalParking();
    loadIncidents();
  }, [user, loadIncidents]);

  useEffect(() => {
    if (SPONSOR_AD) return;
    const interval = setInterval(() => {
      setMemeIndex((i) => (i + 1) % NO_SPONSOR_MEMES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadParkingLocations = async () => {
    if (!user) {
      setParkingLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("parking_locations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading parking locations:", error);
        throw error;
      }

      setParkingLocations(data || []);
    } catch (error) {
      console.error("Error loading parking locations:", error);
    }
  };

  const loadMunicipalParking = async () => {
    try {
      const { data, error } = await supabase
        .from("municipal_parking")
        .select("*")
        .order("borough");

      if (error) {
        console.error("Error loading municipal parking:", error);
        throw error;
      }

      setMunicipalParking(data || []);
    } catch (error) {
      console.error("Error loading municipal parking:", error);
    }
  };

  const openIncidentReportDialog = (
    coteRueId: number,
    streetLabel?: string,
    location?: { lat: number; lng: number },
  ) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setClickedIncidentLocation(location ?? null);
    setSelectedIncidentCoteRueId(coteRueId);
    setSelectedIncidentStreetLabel(streetLabel ?? `Côté de rue #${coteRueId}`);
    setPotholePriority("medium");
    setPotholePhoto(null);
    if (potholePhotoPreview) {
      URL.revokeObjectURL(potholePhotoPreview);
    }
    setPotholePhotoPreview(null);
    setShowPotholeDialog(true);
  };

  const handleIncidentStreetSelect = (
    coteRueId: number,
    streetLabel?: string,
    location?: { lat: number; lng: number },
  ) => {
    if (!potholeModeEnabled) return;
    openIncidentReportDialog(coteRueId, streetLabel, location);
  };

  const handleAddIncidentFromList = () => {
    if (listIncidentsCoteRueId == null) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setReopenIncidentsListAfterReport(true);
    setShowIncidentsListDialog(false);
    openIncidentReportDialog(
      listIncidentsCoteRueId,
      listIncidentsStreetLabel ?? undefined,
    );
  };

  const handlePotholePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    if (potholePhotoPreview) {
      URL.revokeObjectURL(potholePhotoPreview);
    }

    setPotholePhoto(file);
    setPotholePhotoPreview(URL.createObjectURL(file));
  };

  const savePotholeIssue = async () => {
    if (!user || selectedIncidentCoteRueId == null) return;

    if (!potholePhoto) {
      alert("Veuillez ajouter une photo.");
      return;
    }

    setPotholeSaving(true);
    try {
      const fileExt = potholePhoto.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(filePath, potholePhoto, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading incident photo:", uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("incident-photos").getPublicUrl(filePath);

      const { error } = await supabase.from("incidents").insert({
        cote_rue_id: selectedIncidentCoteRueId,
        type: "pot_hole",
        photo_url: publicUrl,
        priority: potholePriority,
        is_approved: false,
        is_banned: false,
        reported_by: user.id,
      });

      if (error) {
        console.error("Error saving incident:", error);
        throw error;
      }

      const savedCoteRueId = selectedIncidentCoteRueId;
      const savedStreetLabel = selectedIncidentStreetLabel;
      const shouldReopenList = reopenIncidentsListAfterReport;

      setShowPotholeDialog(false);
      resetPotholeForm();
      setPotholeModeEnabled(false);
      setReopenIncidentsListAfterReport(false);
      await loadIncidents();

      if (shouldReopenList && savedCoteRueId != null) {
        setListIncidentsCoteRueId(savedCoteRueId);
        setListIncidentsStreetLabel(savedStreetLabel);
        setShowIncidentsListDialog(true);
      }
    } catch (error) {
      console.error("Error saving incident:", error);
      alert("Impossible d'enregistrer le signalement. Réessayez.");
    } finally {
      setPotholeSaving(false);
    }
  };

  const saveParkingLocation = async () => {
    if (!user || !clickedParkingLocation) return;

    try {
      const { data, error } = await supabase
        .from("parking_locations")
        .insert({
          user_id: user.id,
          latitude: clickedParkingLocation.lat,
          longitude: clickedParkingLocation.lng,
          name: parkingName || null,
          notes: parkingNotes || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving parking location:", error);
        throw error;
      }

      setParkingLocations((prev) => [data, ...prev]);
      setShowParkingDialog(false);
      setClickedParkingLocation(null);
      setParkingName("");
      setParkingNotes("");
      setParkingModeEnabled(false);
    } catch (error) {
      console.error("Error saving parking location:", error);
    }
  };

  const deleteParkingLocation = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("parking_locations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting parking location:", error);
        throw error;
      }

      setParkingLocations((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting parking location:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification", payload.new);
          setNotifications((n) => [payload.new, ...n]);
          setNotificationCollapsed(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // State to hold favorite planifications
  const [favoritePlanifications, setFavoritePlanifications] = useState<any[]>(
    [],
  );

  // Load favorite planifications when favorites change
  useEffect(() => {
    if (user && favorites.size > 0) {
      loadFavoritePlanifications().then((favPlanifs) => {
        setFavoritePlanifications(favPlanifs);
      });
    } else {
      setFavoritePlanifications([]);
    }
  }, [user, favorites, loadFavoritePlanifications]);

  // Merge viewport planifications with favorites, avoiding duplicates
  const mergedPlanifications = useMemo(() => {
    const viewportIds = new Set(planifications.map((p: any) => p.coteRueId));

    // Combine viewport data with favorites that aren't already in viewport
    const combined = [...planifications];

    favoritePlanifications.forEach((favPlanif: any) => {
      if (!viewportIds.has(favPlanif.coteRueId)) {
        combined.push(favPlanif);
      }
    });

    return combined;
  }, [planifications, favoritePlanifications]);

  const filteredPlanifications = useMemo(() => {
    if (filterMode === "favorites") {
      const favoriteStreets = mergedPlanifications.filter((p: any) =>
        favorites.has(p.coteRueId),
      );

      // Add parking locations to favorites view
      const parkingItems = parkingLocations.map((parking: any) => ({
        id: `parking-${parking.id}`,
        type: "parking",
        parking: parking,
      }));

      return [...favoriteStreets, ...parkingItems];
    }
    return mergedPlanifications;
  }, [mergedPlanifications, filterMode, favorites, parkingLocations]);

  const incidentCoteRueIds = useMemo(
    () => new Set(incidents.map((i) => i.cote_rue_id)),
    [incidents],
  );

  const planificationsForMap = useMemo(() => {
    if (filterMode !== "incidents" || incidentCoteRueIds.size === 0) {
      return planifications;
    }

    const byId = new Map(
      planifications.map((p: any) => [p.coteRueId, p] as const),
    );
    for (const planif of mergedPlanifications) {
      if (
        incidentCoteRueIds.has(planif.coteRueId) &&
        !byId.has(planif.coteRueId)
      ) {
        byId.set(planif.coteRueId, planif);
      }
    }
    return Array.from(byId.values());
  }, [filterMode, planifications, mergedPlanifications, incidentCoteRueIds]);

  const incidentsForList = useMemo(() => {
    if (listIncidentsCoteRueId == null) return [];
    return incidents.filter((i) => i.cote_rue_id === listIncidentsCoteRueId);
  }, [incidents, listIncidentsCoteRueId]);

  const handleIncidentMarkerClick = (coteRueId: number) => {
    const planif = mergedPlanifications.find(
      (p: any) => p.coteRueId === coteRueId,
    );
    setListIncidentsCoteRueId(coteRueId);
    setListIncidentsStreetLabel(
      planif
        ? getStreetLabelFromPlanification(planif)
        : `Côté de rue #${coteRueId}`,
    );
    setShowIncidentsListDialog(true);
  };

  const focusIncidentOnMap = useCallback(
    (incident: MapIncident) => {
      setSelectedIncidentId(incident.id);
      const planif = mergedPlanifications.find(
        (p: any) => p.coteRueId === incident.cote_rue_id,
      );
      if (planif) {
        setSelectedPlanif(planif);
        setZoomTrigger((prev) => prev + 1);
        return;
      }
      handleIncidentMarkerClick(incident.cote_rue_id);
    },
    [mergedPlanifications],
  );

  const prevFilterModeRef = useRef(filterMode);
  useEffect(() => {
    const enteredIncidents =
      filterMode === "incidents" && prevFilterModeRef.current !== "incidents";
    if (enteredIncidents && incidents.length > 0) {
      focusIncidentOnMap(incidents[0]);
    }
    if (filterMode !== "incidents") {
      setSelectedIncidentId(null);
    }
    prevFilterModeRef.current = filterMode;
  }, [filterMode, incidents, focusIncidentOnMap]);

  const handleMapClick = (lat: number, lng: number) => {
    if (potholeModeEnabled) {
      if (!user) {
        setShowAuthModal(true);
        return;
      }

      const nearest = findNearestStreetPlanification(
        lat,
        lng,
        mergedPlanifications,
      );

      if (!nearest) {
        alert(
          "Aucune rue trouvée à proximité. Zoomez et cliquez plus près d'une rue.",
        );
        return;
      }

      handleIncidentStreetSelect(
        nearest.planification.coteRueId,
        getStreetLabelFromPlanification(nearest.planification),
        { lat, lng },
      );
      return;
    }

    if (!parkingModeEnabled) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setClickedParkingLocation({ lat, lng });
    setParkingName("");
    setParkingNotes("");
    setShowParkingDialog(true);
  };

  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setSearchSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: GeocodingResult) => {
    setSearchQuery(suggestion.display_name);
    setSearchLocation({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      zoom: 15,
    });
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 3) return;

    const results = await searchAddress(searchQuery);

    if (results.length > 0) {
      const firstResult = results[0];
      setSearchLocation({
        lat: parseFloat(firstResult.lat),
        lng: parseFloat(firstResult.lon),
        zoom: 16,
      });
      setSearchQuery(firstResult.display_name);
    }

    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".search-container")) {
        setShowSuggestions(false);
      }
      if (!target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
      if (!target.closest(".stack-menu-container")) {
        setShowStackMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const renderIncidentSidebarItem = (incident: MapIncident) => {
    const planif = mergedPlanifications.find(
      (p: any) => p.coteRueId === incident.cote_rue_id,
    );
    const streetLabel = planif
      ? getStreetLabelFromPlanification(planif)
      : `Côté de rue #${incident.cote_rue_id}`;
    const isSelected = selectedIncidentId === incident.id;

    return (
      <div
        key={incident.id}
        className={`p-3 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? darkMode
              ? "bg-orange-900/30 border-orange-500"
              : "bg-orange-50 border-orange-400"
            : darkMode
              ? "bg-gray-700 border-gray-600 hover:bg-orange-900/20 hover:border-orange-500"
              : "bg-gray-50 border-gray-200 hover:bg-orange-50 hover:border-orange-300"
        }`}
        onClick={() => {
          focusIncidentOnMap(incident);
          setSidebarOpen(false);
        }}
      >
        <div className='flex items-start gap-2'>
          <Construction
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              darkMode ? "text-orange-400" : "text-orange-600"
            }`}
          />
          <div className='space-y-1 min-w-0 flex-1'>
            <p
              className={`font-medium text-sm truncate ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {streetLabel}
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  incident.priority === "high"
                    ? darkMode
                      ? "bg-red-900/60 text-white"
                      : "bg-red-100 text-red-800"
                    : incident.priority === "medium"
                      ? darkMode
                        ? "bg-orange-900/60 text-white"
                        : "bg-orange-100 text-orange-800"
                      : darkMode
                        ? "bg-gray-600 text-white"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {INCIDENT_PRIORITY_LABELS[incident.priority]}
              </span>
              {incident.is_approved && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    darkMode
                      ? "bg-green-900/60 text-white"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  Approuvé
                </span>
              )}
            </div>
            <p
              className={`text-xs ${darkMode ? "text-white" : "text-gray-500"}`}
            >
              {new Date(incident.created_at).toLocaleString("fr-CA")}
            </p>
          </div>
        </div>
        {incident.photo_url && (
          <img
            src={incident.photo_url}
            alt='Photo du signalement'
            className='mt-2 w-full h-20 object-cover rounded-md border'
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${
        darkMode ? "bg-gray-900" : "bg-white"
      }`}
    >
      <header
        className={`${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-b px-4 py-3 flex items-center gap-4 shrink-0`}
      >
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`lg:hidden ${
            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
        >
          {sidebarOpen ? (
            <X
              className={`h-5 w-5 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            />
          ) : (
            <Menu
              className={`h-5 w-5 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}
            />
          )}
        </Button>

        <div className='flex items-center gap-1 flex-1'>
          <h1
            className={`text-2xl ${
              darkMode ? "text-gray-100" : "text-gray-900"
            } flex items-baseline`}
          >
            <span className='font-patrick-hand text-3xl'>MaVille.Club</span>
          </h1>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setDarkMode(!darkMode)}
          className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        >
          {darkMode ? (
            <Sun className='h-5 w-5 text-gray-300' />
          ) : (
            <Moon className='h-5 w-5 text-gray-600' />
          )}
        </Button>
        <div className='relative user-menu-container'>
          <button onClick={handleAvatarClick} className='focus:outline-none'>
            <Avatar className='h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity'>
              <AvatarImage src='' alt='User' />
              <AvatarFallback
                className={`${
                  darkMode
                    ? "flex h-full w-full items-center justify-center text-gray-300 bg-blue-900"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <User className='h-5 w-5' />
              </AvatarFallback>
            </Avatar>
          </button>
          {showUserMenu && user && (
            <div
              className={`absolute right-0 top-12 w-64 rounded-lg shadow-lg border ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              } z-50`}
            >
              <div
                className={`px-4 py-3 border-b ${
                  darkMode ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    darkMode ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  Signed in as
                </p>
                <p
                  className={`text-xs truncate ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${
                  darkMode
                    ? "hover:bg-gray-700 text-gray-200"
                    : "hover:bg-gray-50 text-gray-900"
                }`}
              >
                <LogOut className='h-4 w-4' />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={loadFavorites}
      />

      <div className='flex-1 flex overflow-hidden relative'>
        {sidebarOpen && (
          <div
            className='fixed inset-0 top-[57px] bg-black/50 z-40 lg:hidden'
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`w-96 ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          } border-r flex flex-col overflow-hidden fixed lg:relative top-[57px] lg:top-0 bottom-0 left-0 z-50 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {notifications.length > 0 && (
            <div
              className={`overflow-hidden ${
                darkMode
                  ? "bg-gradient-to-r from-blue-900 to-blue-800 border-blue-700"
                  : "bg-gradient-to-r from-blue-500 to-blue-600"
              } border-b`}
            >
              <div className='animate-slide-in'>
                {notificationCollapsed ? (
                  <div
                    className='p-2 flex items-center gap-3 cursor-pointer'
                    onClick={() => setNotificationCollapsed(false)}
                  >
                    <div className='shrink-0'>
                      <Bell className='h-5 w-5 text-white animate-shake-5s' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white font-semibold text-sm truncate'>
                        Snow Removal Update
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationCollapsed(false);
                      }}
                      className='shrink-0 text-white/80 hover:text-white transition-colors'
                    >
                      <ChevronDown className='h-4 w-4' />
                    </button>
                  </div>
                ) : (
                  <div className='p-3 flex items-start gap-3'>
                    <div className='shrink-0 mt-0.5'>
                      <Bell className='h-5 w-5 text-white animate-shake-5s' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-white font-semibold text-sm mb-1'>
                        Snow Removal Update
                      </p>
                      <p className='text-white/90 text-xs leading-relaxed'>
                        Status changed from{" "}
                        <span className='font-medium'>
                          {getEtatDeneigStatus(notifications[0].old_etat)}
                        </span>{" "}
                        to{" "}
                        <span className='font-medium'>
                          {getEtatDeneigStatus(notifications[0].new_etat)}
                        </span>
                      </p>
                      <p className='text-white/70 text-xs mt-1'>
                        {new Date(
                          notifications[0].created_at,
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotificationCollapsed(true)}
                      className='shrink-0 text-white/80 hover:text-white transition-colors'
                    >
                      <ChevronUp className='h-4 w-4' />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div
            className={`p-4 ${
              darkMode ? "border-gray-700" : "border-gray-200"
            } border-b`}
          >
            <p
              className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              } mb-3`}
            >
              {loading && !hasInitialBounds
                ? "Loading..."
                : filterMode === "incidents"
                  ? `${incidents.length} signalement${
                      incidents.length === 1 ? "" : "s"
                    } (plus récents en premier)`
                  : filterMode === "all"
                    ? `${filteredPlanifications.length} rue${
                        filteredPlanifications.length === 1 ? "" : "s"
                      }${incidents.length > 0 ? ` · ${incidents.length} signalement${incidents.length === 1 ? "" : "s"}` : ""}`
                    : `${filteredPlanifications.length} ${
                        filteredPlanifications.length === 1 ? "item" : "items"
                      }${filterMode === "favorites" ? " (Favoris & parking)" : ""}`}
            </p>
            <div className='mb-3 flex justify-center'>
              <SegmentControl
                options={[
                  { value: "all", label: "Tous" },
                  { value: "favorites", label: "Favoris" },
                  { value: "incidents", label: "Incidents" },
                ]}
                value={filterMode}
                onValueChange={(value) =>
                  setFilterMode(value as "all" | "favorites" | "incidents")
                }
                className='w-full'
                darkMode={darkMode}
              />
            </div>
            <Button
              onClick={() => loadSnowPlanning(true, currentBounds || undefined)}
              disabled={loading}
              variant='outline'
              size='sm'
              className={`w-full ${
                darkMode
                  ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-gray-100"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""} ${
                  darkMode ? "text-gray-200" : "text-gray-700"
                }`}
              />
              Rafraîchir les données
            </Button>
          </div>

          <div className='flex-1 overflow-y-auto p-4'>
            <div className='space-y-2'>
              {filterMode === "incidents" ? (
                incidents.map(renderIncidentSidebarItem)
              ) : (
                <>
                  {filterMode === "all" && incidents.length > 0 && (
                    <div className='space-y-2 mb-4'>
                      <p
                        className={`text-xs font-semibold uppercase tracking-wider px-1 ${
                          darkMode ? "text-orange-400" : "text-orange-600"
                        }`}
                      >
                        Signalements récents
                      </p>
                      {incidents.map(renderIncidentSidebarItem)}
                    </div>
                  )}
                  {filteredPlanifications.map((item: any, index: number) => {
                    // Handle parking locations
                    if (item.type === "parking") {
                      const parking = item.parking;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border transition-all relative ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 hover:bg-blue-900/20 hover:border-blue-500"
                              : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  "Are you sure you want to delete this parking location?",
                                )
                              ) {
                                deleteParkingLocation(parking.id);
                              }
                            }}
                            className={`absolute top-2 right-2 p-1 rounded-full ${
                              darkMode
                                ? "hover:bg-gray-600"
                                : "hover:bg-gray-200"
                            } transition-colors`}
                            title='Delete parking location'
                          >
                            <X className='h-4 w-4 text-gray-400 hover:text-red-500' />
                          </button>
                          <div
                            className='space-y-1 pr-8 cursor-pointer'
                            onClick={() => {
                              // Zoom to parking location and select it
                              setSearchLocation(null); // Clear search location to avoid showing search marker
                              setSelectedParkingLocationId(parking.id);
                              // Set search location for zooming, but clear it after a moment so parking popup shows
                              setSearchLocation({
                                lat: parking.latitude,
                                lng: parking.longitude,
                                zoom: 18,
                              });
                              // Clear search location after map has zoomed so parking popup shows
                              setTimeout(() => {
                                setSearchLocation(null);
                              }, 500);
                              setSidebarOpen(false);
                            }}
                          >
                            <div className='flex items-center gap-2'>
                              <div
                                className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                  darkMode ? "bg-blue-600" : "bg-blue-500"
                                } text-white text-xs font-bold`}
                              >
                                P
                              </div>
                              <p
                                className={`font-medium text-sm ${
                                  darkMode ? "text-gray-100" : "text-gray-900"
                                }`}
                              >
                                {parking.name || "Parking Location"}
                              </p>
                            </div>
                            {parking.notes && (
                              <p
                                className={`text-xs ${
                                  darkMode ? "text-gray-300" : "text-gray-600"
                                }`}
                              >
                                {parking.notes}
                              </p>
                            )}
                            <p
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {parking.latitude.toFixed(5)},{" "}
                              {parking.longitude.toFixed(5)}
                            </p>
                            <p
                              className={`text-xs ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {new Date(parking.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Handle regular planifications
                    const planif = item;
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all relative ${
                          selectedPlanif === planif
                            ? darkMode
                              ? "bg-blue-900/30 border-blue-500"
                              : "bg-blue-50 border-blue-300"
                            : darkMode
                              ? "bg-gray-700 border-gray-600 hover:bg-blue-900/20 hover:border-blue-500"
                              : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(planif.coteRueId);
                          }}
                          className={`absolute top-2 right-2 p-1 rounded-full ${
                            darkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
                          } transition-colors`}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              favorites.has(planif.coteRueId)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-400"
                            }`}
                          />
                        </button>
                        <div
                          className='space-y-1 pr-8 cursor-pointer'
                          onClick={() => {
                            setSelectedPlanif(planif);
                            setZoomTrigger((prev) => prev + 1);
                            setSidebarOpen(false);
                          }}
                        >
                          <p
                            className={`font-medium text-sm ${
                              darkMode ? "text-gray-100" : "text-gray-900"
                            }`}
                          >
                            {planif.streetFeature?.properties?.NOM_VOIE}{" "}
                            {planif.streetFeature?.properties?.TYPE_F}
                          </p>
                          <div className='flex items-center gap-2'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{
                                backgroundColor: getEtatDeneigColor(
                                  planif.etatDeneig,
                                ),
                              }}
                            />
                            <p
                              className={`text-xs ${
                                darkMode ? "text-gray-300" : "text-gray-600"
                              }`}
                            >
                              <span className='font-medium'>
                                {getEtatDeneigStatus(planif.etatDeneig)}
                              </span>
                            </p>
                          </div>
                          <p
                            className={`text-xs ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {planif.streetFeature?.properties?.NOM_VILLE} •{" "}
                            {planif.streetFeature?.properties?.COTE}
                          </p>
                          {/* 
                        Only show the address if the value is not 0 or undefined/null.
                        Prevents rendering "0" as a valid address.
                      */}
                          {planif.streetFeature?.properties?.DEBUT_ADRESSE !==
                            undefined &&
                            planif.streetFeature?.properties?.DEBUT_ADRESSE !==
                              null &&
                            Number(
                              planif.streetFeature?.properties?.DEBUT_ADRESSE,
                            ) !== 0 && (
                              <p
                                className={`text-xs ${
                                  darkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                Address:{" "}
                                {
                                  planif.streetFeature?.properties
                                    ?.DEBUT_ADRESSE
                                }
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {((filterMode === "incidents" && incidents.length === 0) ||
                (filterMode === "all" &&
                  filteredPlanifications.length === 0 &&
                  incidents.length === 0) ||
                (filterMode === "favorites" &&
                  filteredPlanifications.length === 0)) &&
                !loading && (
                  <div className='text-center py-12'>
                    {filterMode === "incidents" ? (
                      <>
                        <Construction
                          className={`h-12 w-12 ${
                            darkMode ? "text-gray-600" : "text-gray-300"
                          } mx-auto mb-3`}
                        />
                        <p
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Aucun signalement pour l’instant
                        </p>
                        <p
                          className={`text-xs ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          } mt-1`}
                        >
                          Activez le mode nid-de-poule sur la carte pour en
                          ajouter
                        </p>
                      </>
                    ) : filterMode === "favorites" ? (
                      <>
                        <Heart
                          className={`h-12 w-12 ${
                            darkMode ? "text-gray-600" : "text-gray-300"
                          } mx-auto mb-3`}
                        />
                        <p
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Aucun favori pour l’instant
                        </p>
                        <p
                          className={`text-xs ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          } mt-1`}
                        >
                          Cliquez sur l’icône le coeur pour ajouter aux favoris
                        </p>
                      </>
                    ) : (
                      <>
                        <Snowflake
                          className={`h-12 w-12 ${
                            darkMode ? "text-gray-600" : "text-gray-300"
                          } mx-auto mb-3`}
                        />
                        <p
                          className={`text-sm ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Aucune planification disponible
                        </p>
                        <p
                          className={`text-xs ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          } mt-1`}
                        >
                          Rafraîchir les données
                        </p>
                      </>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Sponsor Container */}
          <div
            className={`shrink-0 border-t ${
              darkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className='p-4'>
              <div
                className={`rounded-lg border-2 border-dashed ${
                  darkMode
                    ? "border-gray-600 bg-gray-700/50"
                    : "border-gray-300 bg-gray-50"
                } p-4 text-center transition-all hover:border-opacity-80 overflow-hidden`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {SPONSOR_AD
                    ? "Espace Publicitaire"
                    : "Espace Publicitaire (vide)"}
                </p>
                {SPONSOR_AD ? (
                  <a
                    href={SPONSOR_AD.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block'
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SPONSOR_AD.imageUrl}
                      alt={SPONSOR_AD.label ?? "Publicité"}
                      className='h-28 w-full rounded object-contain'
                    />
                  </a>
                ) : (
                  <>
                    <div
                      className={`relative h-28 w-full overflow-hidden rounded ${
                        darkMode ? "bg-gray-800" : "bg-white"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={NO_SPONSOR_MEMES[memeIndex].src}
                        src={NO_SPONSOR_MEMES[memeIndex].src}
                        alt={NO_SPONSOR_MEMES[memeIndex].alt}
                        className='h-full w-full object-cover'
                      />
                    </div>
                    <p
                      className={`text-xs mt-2 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {NO_SPONSOR_MEMES[memeIndex].caption}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className='flex-1 relative'>
          {/* Map mode toggle buttons */}
          <div className='absolute top-4 right-4 z-10 flex flex-col gap-2'>
            <Button
              onClick={() => {
                const newValue = !parkingModeEnabled;
                setParkingModeEnabled(newValue);
                if (newValue) {
                  setPotholeModeEnabled(false);
                  setShowParkingMessage(true);
                  setTimeout(() => {
                    setShowParkingMessage(false);
                  }, 5000);
                }
              }}
              className={`shadow-lg transition-all ${
                parkingModeEnabled
                  ? "bg-[#22c55e] hover:bg-[#16a34a] text-white"
                  : "bg-[#6b7280] hover:bg-[#4b5563] text-white"
              }`}
              size='icon'
              title={
                parkingModeEnabled
                  ? "Click map to save parking location (Click again to disable)"
                  : "Enable parking location saving"
              }
            >
              <Car className='h-5 w-5' />
            </Button>
            <Button
              onClick={() => {
                const newValue = !potholeModeEnabled;
                setPotholeModeEnabled(newValue);
                if (newValue) {
                  setParkingModeEnabled(false);
                  setShowPotholeMessage(true);
                  setTimeout(() => {
                    setShowPotholeMessage(false);
                  }, 5000);
                }
              }}
              className={`shadow-lg transition-all ${
                potholeModeEnabled
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-[#6b7280] hover:bg-[#4b5563] text-white"
              }`}
              size='icon'
              title={
                potholeModeEnabled
                  ? "Cliquez sur une rue pour signaler (cliquez à nouveau pour désactiver)"
                  : "Signaler un nid-de-poule"
              }
            >
              <Construction className='h-5 w-5' />
            </Button>
          </div>

          {/* Stack Menu Button */}
          <div className='absolute top-28 right-4 z-20 stack-menu-container'>
            <div className='relative'>
              <Button
                onClick={() => setShowStackMenu(!showStackMenu)}
                className={`shadow-lg ${
                  darkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                    : "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"
                } border`}
                size='icon'
                title='More options'
              >
                <Layers className='h-5 w-5' />
              </Button>

              {/* Stack Menu Dropdown */}
              {showStackMenu && (
                <div
                  className={`absolute top-full right-0 mt-2 rounded-lg shadow-xl border ${
                    darkMode
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  } overflow-hidden z-30`}
                >
                  <button
                    onClick={() => {
                      const newValue = !parkingModeEnabled;
                      setParkingModeEnabled(newValue);
                      if (newValue) {
                        setShowParkingMessage(true);
                        setTimeout(() => {
                          setShowParkingMessage(false);
                        }, 5000);
                      }
                      setShowStackMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-opacity-80 transition-colors ${
                      parkingModeEnabled
                        ? darkMode
                          ? "bg-[#22c55e] hover:bg-[#16a34a] text-white"
                          : "bg-[#22c55e] hover:bg-[#16a34a] text-white"
                        : darkMode
                          ? "hover:bg-gray-700 text-gray-100"
                          : "hover:bg-gray-50 text-gray-900"
                    }`}
                  >
                    <Car className='h-4 w-4 shrink-0' />
                    <span className='text-sm font-medium whitespace-nowrap'>
                      {parkingModeEnabled
                        ? "Désactiver parking"
                        : "Activer parking"}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const newValue = !municipalParkingEnabled;
                      setMunicipalParkingEnabled(newValue);
                      if (newValue) {
                        // Show message for 5 seconds when municipal parking is enabled
                        setShowMunicipalParkingMessage(true);
                        setTimeout(() => {
                          setShowMunicipalParkingMessage(false);
                        }, 5000);
                      }
                      setShowStackMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-opacity-80 transition-colors border-t ${
                      municipalParkingEnabled
                        ? darkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white border-gray-700"
                          : "bg-blue-600 hover:bg-blue-700 text-white border-gray-200"
                        : darkMode
                          ? "hover:bg-gray-700 text-gray-100 border-gray-700"
                          : "hover:bg-gray-50 text-gray-900 border-gray-200"
                    }`}
                  >
                    <MapPin className='h-4 w-4 shrink-0' />
                    <span className='text-sm font-medium whitespace-nowrap'>
                      {municipalParkingEnabled
                        ? "Masquer parking municipal"
                        : "Afficher parking municipal"}
                    </span>
                  </button>

                  <button
                    onClick={getCurrentLocation}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-opacity-80 transition-colors border-t ${
                      darkMode
                        ? "hover:bg-gray-700 text-gray-100 border-gray-700"
                        : "hover:bg-gray-50 text-gray-900 border-gray-200"
                    }`}
                  >
                    <Navigation className='h-4 w-4 shrink-0' />
                    <span className='text-sm font-medium whitespace-nowrap'>
                      Trouve moi
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pothole Mode Message */}
          {showPotholeMessage && (
            <div className='absolute top-4 left-4 right-20 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-md z-50'>
              <div className='mt-14'>
                <div
                  className={`rounded-lg shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 bg-orange-600 text-white`}
                >
                  <p className='text-sm font-medium'>
                    Cliquez sur la carte pour signaler un nid-de-poule
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parking Mode Message */}
          {showParkingMessage && (
            <div className='absolute top-4 left-4 right-20 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-md z-50'>
              <div className='mt-14'>
                <div
                  className={`rounded-lg shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 ${
                    darkMode
                      ? "bg-[#22c55e] text-white"
                      : "bg-[#22c55e] text-white"
                  }`}
                >
                  <p className='text-sm font-medium'>
                    Veuillez cliquer sur la carte pour enregistrer le
                    stationnement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Municipal Parking Message */}
          {showMunicipalParkingMessage && (
            <div className='absolute top-4 left-4 right-20 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-md z-50'>
              <div className='mt-14'>
                <div
                  className={`rounded-lg shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-2 ${
                    darkMode
                      ? "bg-[#ef4444] text-white"
                      : "bg-[#ef4444] text-white"
                  }`}
                >
                  <p className='text-sm font-medium'>
                    Les parkings public sont en rouge avec P
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className='absolute top-4 left-4 right-20 md:left-1/2 md:-translate-x-1/2 md:right-auto z-10 md:w-full md:max-w-md'>
            <form onSubmit={handleSearch} className='relative search-container'>
              <div className='relative'>
                <Input
                  type='text'
                  placeholder='Rechercher une adresse à Montréal...'
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() =>
                    searchSuggestions.length > 0 && setShowSuggestions(true)
                  }
                  className={`shadow-lg pr-10 w-full ${
                    darkMode
                      ? "bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  }`}
                />
                <Search
                  className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    className={`absolute top-full mt-2 w-full rounded-lg shadow-xl border ${
                      darkMode
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    } max-h-80 overflow-y-auto z-50`}
                  >
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type='button'
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`w-full text-left px-4 py-3 hover:bg-opacity-80 transition-colors border-b last:border-b-0 ${
                          darkMode
                            ? "hover:bg-gray-700 border-gray-700 text-gray-100"
                            : "hover:bg-gray-50 border-gray-100 text-gray-900"
                        }`}
                      >
                        <div className='flex items-start gap-2'>
                          <MapPin
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              darkMode ? "text-blue-400" : "text-blue-600"
                            }`}
                          />
                          <div className='flex-1 min-w-0'>
                            <p
                              className={`text-sm font-medium truncate ${
                                darkMode ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {suggestion.address.road
                                ? `${suggestion.address.house_number || ""} ${
                                    suggestion.address.road
                                  }`.trim()
                                : suggestion.display_name.split(",")[0]}
                            </p>
                            <p
                              className={`text-xs truncate ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {[
                                suggestion.address.suburb,
                                suggestion.address.city ||
                                  suggestion.address.municipality,
                                suggestion.address.postcode,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>

          {initialCenter ? (
            <SnowMap
              planifications={planificationsForMap}
              selectedPlanification={selectedPlanif}
              darkMode={darkMode}
              searchLocation={searchLocation}
              initialCenter={initialCenter}
              zoomTrigger={zoomTrigger}
              onPlanificationClick={(planif) => {
                setSelectedPlanif(planif);
                setZoomTrigger((prev) => prev + 1);
              }}
              onBoundsChange={handleBoundsChange}
              enableDynamicFetching={true}
              onMapClick={handleMapClick}
              incidentReportModeEnabled={potholeModeEnabled}
              onIncidentStreetSelect={handleIncidentStreetSelect}
              parkingLocations={parkingLocations}
              onParkingLocationDelete={deleteParkingLocation}
              selectedParkingLocationId={selectedParkingLocationId}
              loading={loading}
              municipalParking={municipalParkingEnabled ? municipalParking : []}
              incidents={incidents}
              onIncidentMarkerClick={handleIncidentMarkerClick}
            />
          ) : (
            <div className='relative w-full h-full'>
              <Skeleton
                className={`w-full h-full ${
                  darkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              />
              <div className='absolute inset-0 flex flex-col items-center justify-center gap-4'>
                <div className='flex flex-col items-center gap-2'>
                  <MapPin
                    className={`h-8 w-8 ${
                      darkMode ? "text-gray-600" : "text-gray-400"
                    } animate-pulse`}
                  />
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Loading map...
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedPlanif && (
            <div
              className='fixed lg:absolute bottom-0 left-0 lg:left-0 right-0 p-6 shadow-2xl z-20 transition-all'
              style={{
                backgroundColor: getEtatDeneigColor(selectedPlanif.etatDeneig),
              }}
            >
              <div className='max-w-4xl mx-auto'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex-1'>
                    <h3 className='text-white font-bold text-2xl mb-1'>
                      {selectedPlanif.streetFeature?.properties?.NOM_VOIE}{" "}
                      {selectedPlanif.streetFeature?.properties?.TYPE_F}
                    </h3>
                    <p className='text-white/90 text-lg font-medium'>
                      {getEtatDeneigStatus(selectedPlanif.etatDeneig)}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(selectedPlanif.coteRueId);
                      }}
                      variant='ghost'
                      size='icon'
                      className='text-white hover:bg-white/20 shrink-0'
                      title={
                        favorites.has(selectedPlanif.coteRueId)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          favorites.has(selectedPlanif.coteRueId)
                            ? "fill-white text-white"
                            : "text-white/70"
                        }`}
                      />
                    </Button>
                    <Button
                      onClick={() => setSelectedPlanif(null)}
                      variant='ghost'
                      size='icon'
                      className='text-white hover:bg-white/20 shrink-0 group'
                    >
                      <span className='text-2xl leading-none text-white group-hover:text-white'>
                        ×
                      </span>
                    </Button>
                  </div>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div>
                    <p className='text-white/70 text-xs uppercase font-semibold mb-1'>
                      Municipalité
                    </p>
                    <p className='text-white font-medium'>
                      {selectedPlanif.streetFeature?.properties?.NOM_VILLE}
                    </p>
                  </div>
                  <div>
                    <p className='text-white/70 text-xs uppercase font-semibold mb-1'>
                      Côté
                    </p>
                    <p className='text-white font-medium'>
                      {selectedPlanif.streetFeature?.properties?.COTE}
                    </p>
                  </div>
                  {selectedPlanif.streetFeature?.properties?.DEBUT_ADRESSE && (
                    <div>
                      <p className='text-white/70 text-xs uppercase font-semibold mb-1'>
                        Plage d’adresses
                      </p>
                      <p className='text-white font-medium'>
                        {
                          selectedPlanif.streetFeature?.properties
                            ?.DEBUT_ADRESSE
                        }
                        {selectedPlanif.streetFeature?.properties
                          ?.FIN_ADRESSE &&
                          selectedPlanif.streetFeature?.properties
                            ?.FIN_ADRESSE !==
                            selectedPlanif.streetFeature?.properties
                              ?.DEBUT_ADRESSE &&
                          ` - ${selectedPlanif.streetFeature?.properties?.FIN_ADRESSE}`}
                      </p>
                    </div>
                  )}
                  {selectedPlanif.dateMaj && (
                    <div>
                      <p className='text-white/70 text-xs uppercase font-semibold mb-1'>
                        Dernière mise à jour
                      </p>
                      <p className='text-white font-medium'>
                        {new Date(selectedPlanif.dateMaj).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Incidents list for a street */}
          <Dialog
            open={showIncidentsListDialog}
            onOpenChange={(open) => {
              setShowIncidentsListDialog(open);
              if (!open && !reopenIncidentsListAfterReport) {
                setListIncidentsCoteRueId(null);
                setListIncidentsStreetLabel(null);
              }
            }}
          >
            <DialogContent
              className={`max-w-lg ${darkMode ? "bg-gray-800" : ""}`}
            >
              <DialogHeader>
                <DialogTitle className={darkMode ? "text-gray-100" : ""}>
                  Signalements — {listIncidentsStreetLabel ?? "Rue"}
                </DialogTitle>
                <DialogDescription className={darkMode ? "text-gray-400" : ""}>
                  {incidentsForList.length}{" "}
                  {incidentsForList.length === 1
                    ? "signalement enregistré"
                    : "signalements enregistrés"}{" "}
                  pour cette rue.
                </DialogDescription>
              </DialogHeader>
              <div className='max-h-[60vh] overflow-y-auto space-y-3 py-2'>
                {incidentsForList.length === 0 ? (
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Aucun signalement pour cette rue.
                  </p>
                ) : (
                  incidentsForList.map((incident) => (
                    <div
                      key={incident.id}
                      className={`rounded-lg border p-3 space-y-2 ${
                        darkMode
                          ? "border-gray-600 bg-gray-700/50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      {incident.photo_url && (
                        <a
                          href={incident.photo_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='block'
                        >
                          <img
                            src={incident.photo_url}
                            alt='Photo du signalement'
                            className='w-full h-40 object-cover rounded-md border'
                          />
                        </a>
                      )}
                      <div className='flex flex-wrap items-center gap-2 text-sm'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            incident.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : incident.priority === "medium"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          Priorité :{" "}
                          {INCIDENT_PRIORITY_LABELS[incident.priority]}
                        </span>
                        <span
                          className={`text-xs ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Nid-de-poule
                        </span>
                        {incident.is_approved && (
                          <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
                            Approuvé
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {new Date(incident.created_at).toLocaleString("fr-CA")}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-between'>
                <Button
                  onClick={handleAddIncidentFromList}
                  className='w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white'
                >
                  <Construction className='h-4 w-4 mr-2' />
                  Ajouter un signalement
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setShowIncidentsListDialog(false)}
                  className={
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : ""
                  }
                >
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pothole Issue Dialog */}
          <Dialog
            open={showPotholeDialog}
            onOpenChange={(open) => {
              setShowPotholeDialog(open);
              if (!open) {
                if (
                  reopenIncidentsListAfterReport &&
                  listIncidentsCoteRueId != null
                ) {
                  setShowIncidentsListDialog(true);
                  setReopenIncidentsListAfterReport(false);
                }
                resetPotholeForm();
              }
            }}
          >
            <DialogContent className={darkMode ? "bg-gray-800" : ""}>
              <DialogHeader>
                <DialogTitle className={darkMode ? "text-gray-100" : ""}>
                  Signaler un nid-de-poule
                </DialogTitle>
                <DialogDescription className={darkMode ? "text-gray-400" : ""}>
                  {reopenIncidentsListAfterReport
                    ? "Ajoutez une photo et la priorité pour ce signalement sur la rue sélectionnée."
                    : "Cliquez sur la carte pour choisir l'emplacement, puis ajoutez une photo et la priorité du signalement."}
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                {selectedIncidentCoteRueId != null && (
                  <>
                    {clickedIncidentLocation && (
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Emplacement : {clickedIncidentLocation.lat.toFixed(5)},{" "}
                        {clickedIncidentLocation.lng.toFixed(5)}
                      </p>
                    )}
                    <div className='space-y-2'>
                      <Label className={darkMode ? "text-gray-200" : ""}>
                        Rue sélectionnée
                      </Label>
                      <Input
                        readOnly
                        value={
                          selectedIncidentStreetLabel ??
                          String(selectedIncidentCoteRueId)
                        }
                        className={
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-gray-100"
                            : "bg-gray-50"
                        }
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className={darkMode ? "text-gray-200" : ""}>
                        Type
                      </Label>
                      <p
                        className={`text-sm rounded-md border px-3 py-2 ${
                          darkMode
                            ? "border-gray-600 bg-gray-700 text-gray-100"
                            : "border-gray-200 bg-gray-50 text-gray-800"
                        }`}
                      >
                        Nid-de-poule
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <Label
                        className={darkMode ? "text-gray-200" : ""}
                        htmlFor='pothole-photo'
                      >
                        Photo
                      </Label>
                      <input
                        ref={potholePhotoInputRef}
                        id='pothole-photo'
                        type='file'
                        accept='image/*'
                        capture='environment'
                        className='hidden'
                        onChange={handlePotholePhotoChange}
                      />
                      {potholePhotoPreview ? (
                        <div className='relative'>
                          <img
                            src={potholePhotoPreview}
                            alt='Aperçu du nid-de-poule'
                            className='w-full h-40 object-cover rounded-lg border'
                          />
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2'
                            onClick={() => {
                              if (potholePhotoPreview) {
                                URL.revokeObjectURL(potholePhotoPreview);
                              }
                              setPotholePhoto(null);
                              setPotholePhotoPreview(null);
                              if (potholePhotoInputRef.current) {
                                potholePhotoInputRef.current.value = "";
                              }
                            }}
                          >
                            Changer
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type='button'
                          variant='outline'
                          className={`w-full h-24 border-dashed ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                              : ""
                          }`}
                          onClick={() => potholePhotoInputRef.current?.click()}
                        >
                          <div className='flex flex-col items-center gap-2'>
                            <Upload className='h-5 w-5' />
                            <span className='text-sm'>Ajouter une photo</span>
                          </div>
                        </Button>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label
                        className={darkMode ? "text-gray-200" : ""}
                        htmlFor='pothole-priority'
                      >
                        Priorité
                      </Label>
                      <Select
                        value={potholePriority}
                        onValueChange={(value: "low" | "medium" | "high") =>
                          setPotholePriority(value)
                        }
                      >
                        <SelectTrigger
                          id='pothole-priority'
                          className={
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-100"
                              : ""
                          }
                        >
                          <SelectValue placeholder='Choisir la priorité' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='low'>Basse</SelectItem>
                          <SelectItem value='medium'>Moyenne</SelectItem>
                          <SelectItem value='high'>Haute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => {
                    setShowPotholeDialog(false);
                    resetPotholeForm();
                  }}
                  disabled={potholeSaving}
                  className={
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : ""
                  }
                >
                  Annuler
                </Button>
                <Button
                  onClick={savePotholeIssue}
                  disabled={
                    potholeSaving || !user || selectedIncidentCoteRueId == null
                  }
                  className='bg-orange-600 hover:bg-orange-700 text-white'
                >
                  {potholeSaving
                    ? "Enregistrement..."
                    : user
                      ? "Envoyer le signalement"
                      : "Connexion requise"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Motion sensor banner – shown on mobile when permission not yet granted */}
          {motionSupported && permissionState !== "granted" && (
            <MotionPermissionBanner
              permissionState={permissionState}
              onRequestPermission={requestPermission}
              darkMode={darkMode}
            />
          )}

          {/* Parking Location Dialog */}
          <Dialog open={showParkingDialog} onOpenChange={setShowParkingDialog}>
            <DialogContent className={darkMode ? "bg-gray-800" : ""}>
              <DialogHeader>
                <DialogTitle className={darkMode ? "text-gray-100" : ""}>
                  Save Parking Location
                </DialogTitle>
                <DialogDescription className={darkMode ? "text-gray-400" : ""}>
                  Click on the map to mark where you parked your car. Add a name
                  and notes to help you remember.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                {clickedParkingLocation && (
                  <div className='space-y-2'>
                    <p
                      className={`text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Location: {clickedParkingLocation.lat.toFixed(5)},{" "}
                      {clickedParkingLocation.lng.toFixed(5)}
                    </p>
                    <Input
                      placeholder='Parking location name (optional)'
                      value={parkingName}
                      onChange={(e) => setParkingName(e.target.value)}
                      className={
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-gray-100"
                          : ""
                      }
                    />
                    <Textarea
                      placeholder='Notes (optional)'
                      value={parkingNotes}
                      onChange={(e) => setParkingNotes(e.target.value)}
                      rows={3}
                      className={
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-gray-100"
                          : ""
                      }
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => {
                    setShowParkingDialog(false);
                    setClickedParkingLocation(null);
                    setParkingName("");
                    setParkingNotes("");
                  }}
                  className={
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : ""
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveParkingLocation}
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Save Parking Location
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { Hero } from "@/components/hero";
import { WhyChooseUs } from "@/components/why-choose-us";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://www.maville.club",
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <WhyChooseUs />
    </>
  );
}

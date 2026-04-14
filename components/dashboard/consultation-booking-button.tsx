"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface ConsultationBookingButtonProps {
  eligible: boolean;
}

export function ConsultationBookingButton({
  eligible,
}: ConsultationBookingButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleBook() {
    setLoading(true);
    try {
      const res = await fetch("/api/consultations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleBook}
      loading={loading}
      variant={eligible ? "primary" : "secondary"}
      size="lg"
    >
      <Calendar className="mr-2 h-4 w-4" />
      Book Session
    </Button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { apiPost } from "@/lib/api";
import {
  HAZARD_TYPES,
  SEVERITIES,
  type HazardType,
  type Location,
  type ReportResponse,
  type ScenarioId,
  type Severity,
} from "@/lib/types";

/**
 * Field hazard report form.
 *
 * Posts to POST /api/reports. When the hazard is crack evidence the backend
 * raises that road's `crack_reports` feature and re-scores it with the model,
 * so the risk change the operator sees afterwards is a real prediction, not a
 * cosmetic bump.
 *
 * The photo is read to a base64 data URL in the browser and held in memory by
 * the API. Writing uploads to disk on a free-tier host would be lost on the
 * next restart anyway, so the prototype records only that a photo was attached.
 */

/** ~2 MB of binary once base64-encoded — matches MAX_PHOTO_CHARS on the API. */
const MAX_PHOTO_CHARS = 2_800_000;

export default function HazardReportForm({
  open,
  onClose,
  roads,
  defaultLocationId,
  scenario,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  roads: Location[];
  defaultLocationId: string | null;
  scenario: ScenarioId;
  onSubmitted: (result: ReportResponse) => void;
}) {
  const [locationId, setLocationId] = useState("");
  const [hazardType, setHazardType] = useState<HazardType>("New crack");
  const [severity, setSeverity] = useState<Severity>("High");
  const [description, setDescription] = useState("");
  const [reporter, setReporter] = useState("PWD field officer");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Prefill with whatever the operator already has open — in the field they
  // are reporting on the segment they are looking at.
  useEffect(() => {
    if (open) {
      setLocationId(defaultLocationId ?? roads[0]?.id ?? "");
      setError(null);
    }
  }, [open, defaultLocationId, roads]);

  // Escape closes, and focus moves into the dialog when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePhoto = (file: File | null) => {
    if (!file) {
      setPhotoName(null);
      setPhotoData(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      if (result.length > MAX_PHOTO_CHARS) {
        setError("Photo is larger than 2 MB. Choose a smaller image.");
        return;
      }
      setPhotoName(file.name);
      setPhotoData(result);
      setError(null);
    };
    reader.onerror = () => setError("Could not read that image file.");
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!locationId) {
      setError("Choose a location.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiPost<ReportResponse>(
        `/api/reports?scenario=${scenario}`,
        {
          location_id: locationId,
          hazard_type: hazardType,
          severity,
          description,
          reporter: reporter || "Field officer",
          photo_data_url: photoData,
        },
      );
      onSubmitted(result);
      // Reset for the next report, keeping the reporter name.
      setDescription("");
      setPhotoName(null);
      setPhotoData(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full border border-line bg-base px-2.5 py-2 text-xs text-ink outline-none transition-colors focus:border-muted";

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-base/80 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Submit field hazard report"
        tabIndex={-1}
        className="panel w-full max-w-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Field hazard report
            </h2>
            <p className="mt-0.5 text-2xs text-faint">
              New crack and road deformation reports count as evidence and re-score the segment
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report form"
            className="shrink-0 border border-line p-1.5 text-faint transition-colors hover:border-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="space-y-3.5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="hz-location" className="eyebrow mb-1.5 block">
                Location
              </label>
              <select
                id="hz-location"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                className={fieldClass}
              >
                {roads.map((road) => (
                  <option key={road.id} value={road.id}>
                    {road.id} — {road.segment}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hz-type" className="eyebrow mb-1.5 block">
                Hazard type
              </label>
              <select
                id="hz-type"
                value={hazardType}
                onChange={(event) => setHazardType(event.target.value as HazardType)}
                className={fieldClass}
              >
                {HAZARD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="eyebrow mb-1.5 block">Severity</span>
            <div className="flex border border-line" role="group" aria-label="Severity">
              {SEVERITIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  aria-pressed={severity === level}
                  className={`flex-1 px-3 py-2 font-mono text-2xs uppercase tracking-[0.12em] transition-colors ${
                    severity === level
                      ? "bg-ink/10 text-ink"
                      : "text-faint hover:bg-ink/5 hover:text-muted"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="hz-desc" className="eyebrow mb-1.5 block">
              Description
            </label>
            <textarea
              id="hz-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="What did you observe, and where on the segment?"
              className={`${fieldClass} resize-none placeholder:text-faint/70`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="hz-reporter" className="eyebrow mb-1.5 block">
                Reported by
              </label>
              <input
                id="hz-reporter"
                value={reporter}
                onChange={(event) => setReporter(event.target.value)}
                maxLength={120}
                className={fieldClass}
              />
            </div>

            <div>
              <span className="eyebrow mb-1.5 block">Photo (optional)</span>
              <label
                htmlFor="hz-photo"
                className="flex cursor-pointer items-center gap-2 border border-line px-2.5 py-2 text-xs text-muted transition-colors hover:border-muted hover:text-ink"
              >
                <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{photoName ?? "Attach an image"}</span>
              </label>
              <input
                id="hz-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handlePhoto(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {error && (
            <p className="border border-critical/40 bg-critical/10 px-2.5 py-2 text-xs text-ink">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-2xs text-faint">
            Submitting under <span className="stat text-muted">{scenario}</span> conditions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="border border-line px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-muted transition-colors hover:border-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 border border-muted bg-ink/10 px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink/20 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              {submitting ? "Submitting" : "Submit report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePreferences, setPreference } from "@/lib/preferences";
import type { Theme, TextScale } from "@/lib/preferences";
import type { TrainerAvatar } from "@/lib/profile";
import AccountDataSection from "@/components/AccountDataSection";
import TrainerProfileSection from "@/components/TrainerProfileSection";
import MenuList from "@/components/MenuList";

type EditableProfile = {
  currentName: string | null;
  currentAvatar: TrainerAvatar | null;
  currentNickname: string | null;
  palName: string;
};

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="pixel-panel flex items-start justify-between gap-4 p-4">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="mt-1 text-caption text-[var(--foreground-muted)]">
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0"
      />
    </label>
  );
}

export default function PreferencesClient({
  email,
  profile,
}: {
  email: string | null;
  profile: EditableProfile | null;
}) {
  const prefs = usePreferences();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-pixel text-display">Options</h1>
        <p className="mt-3 max-w-xl text-body text-[var(--foreground-muted)]">
          Your trainer is saved to your account; everything below it is saved
          on this device and applies everywhere, including inside battles.
        </p>
      </div>

      {profile && <TrainerProfileSection {...profile} />}

      {/* Theme and text size are selections, so they wear the selector like
          every other selection in the app: gold ring under the cursor, gold
          fill on the one in force. They used to be ad-hoc button rows whose
          "on" state was a brass fill that looked like a primary action
          rather than a current setting. */}
      <section>
        <h2 className="mb-3 font-pixel text-title">Theme</h2>
        <MenuList
          ariaLabel="Choose a theme"
          columns={2}
          options={[
            { id: "bright", label: "Low Tide", hint: "Bright" },
            { id: "dark", label: "Storm Watch", hint: "Dark" },
          ]}
          selectedId={prefs.theme}
          onSelect={(id) => setPreference("theme", id as Theme)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-title">Sound</h2>
        <ToggleRow
          label="Background music"
          description="Original chiptune themes that change between the map, battles, and victory. Generated in the browser — nothing is downloaded."
          checked={prefs.bgmEnabled}
          onChange={(v) => setPreference("bgmEnabled", v)}
        />
        <ToggleRow
          label="Sound effects"
          description="Menu blips, confirmation chimes, and battle hits."
          checked={prefs.sfxEnabled}
          onChange={(v) => setPreference("sfxEnabled", v)}
        />
      </section>

      <section>
        <h2 className="mb-3 font-pixel text-title">Text size</h2>
        <MenuList
          ariaLabel="Choose a text size"
          columns={2}
          options={[
            { id: "sm", label: "Small", hint: "15px" },
            { id: "md", label: "Medium", hint: "16px" },
            { id: "lg", label: "Large", hint: "19px" },
          ]}
          selectedId={prefs.textScale}
          onSelect={(id) => setPreference("textScale", id as TextScale)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-pixel text-title">Accessibility</h2>
        <ToggleRow
          label="Readable font everywhere"
          description="Replaces the pixel font everywhere it appears — headings, navigation, and every line of character dialogue — with the regular sans-serif font."
          checked={prefs.readableFont}
          onChange={(v) => setPreference("readableFont", v)}
        />
        <ToggleRow
          label="Instant text"
          description="Turns off the letter-by-letter typewriter effect in dialogue boxes, showing the full message straight away."
          checked={prefs.instantText}
          onChange={(v) => setPreference("instantText", v)}
        />
        <ToggleRow
          label="Reduce motion"
          description="Disables sprite bobbing, screen shake, transitions, and other decorative motion, regardless of your OS setting."
          checked={prefs.reducedMotion}
          onChange={(v) => setPreference("reducedMotion", v)}
        />
        <ToggleRow
          label="High contrast text"
          description="Removes muted/secondary text tones so all text renders at full contrast."
          checked={prefs.highContrast}
          onChange={(v) => setPreference("highContrast", v)}
        />
      </section>

      <AccountDataSection email={email} />
    </div>
  );
}

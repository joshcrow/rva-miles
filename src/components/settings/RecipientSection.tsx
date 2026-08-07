"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Settings } from "@/types";
import { useSyncedField } from "./useSyncedField";

export interface RecipientSectionProps {
  settings: Settings;
  onPatch: (patch: Partial<Settings>) => Promise<void>;
}

export function RecipientSection({ settings, onPatch }: RecipientSectionProps) {
  const [name, setName] = useSyncedField(settings.reportRecipient?.name ?? "");
  const [email, setEmail] = useSyncedField(settings.reportRecipient?.email ?? "");

  function commit(nextName: string, nextEmail: string) {
    const trimmedName = nextName.trim();
    const trimmedEmail = nextEmail.trim();
    if (
      trimmedName === (settings.reportRecipient?.name ?? "") &&
      trimmedEmail === (settings.reportRecipient?.email ?? "")
    ) {
      return;
    }
    void onPatch({
      reportRecipient: {
        name: trimmedName || undefined,
        email: trimmedEmail || undefined,
      },
    });
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Recipient name"
            placeholder="Manager's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commit(name, email)}
            fullWidth
          />
          <TextField
            label="Recipient email"
            type="email"
            placeholder="manager@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => commit(name, email)}
            fullWidth
            helperText="Prefills the Send to field on the Report tab"
            slotProps={{ htmlInput: { inputMode: "email", autoComplete: "email" } }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default RecipientSection;

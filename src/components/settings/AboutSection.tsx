"use client";

// Version plus the one mechanism a driver actually asks about: what a report
// link is, and why sending one uploads nothing. The screen header already
// names the app, and where the ledger lives is now stated once, in "Your data"
// — neither fact belongs here twice.

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function AboutSection() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Version 2.0.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A report link carries the whole report inside the address itself — whoever you send it
            to can open it anywhere, and nothing is uploaded to send it.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AboutSection;

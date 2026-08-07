"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function AboutSection() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="overline" sx={{ color: "primary.main" }}>
            RVA Miles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version 2.0.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your trips are stored on this device, not on a server. Back them up from the Data
            section above before changing phones.
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

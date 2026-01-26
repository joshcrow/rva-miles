'use client';

import { Container, Typography, Card, CardContent, Button, Box, Stack } from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Link from 'next/link';

const plannedFeatures = [
  { icon: TrendingUpIcon, label: 'Monthly mileage trends' },
  { icon: PieChartOutlineIcon, label: 'Category breakdowns' },
  { icon: DirectionsCarOutlinedIcon, label: 'Vehicle usage comparison' },
  { icon: CalendarMonthOutlinedIcon, label: 'Tax year summaries' },
];

export default function ReportsPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h2" gutterBottom>
        Reports
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <InsightsOutlinedIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Coming Soon
              </Typography>
              <Typography color="text.secondary">
                Advanced reports with charts, trends, and insights
              </Typography>
            </Box>

            <Stack spacing={1.5} sx={{ width: '100%' }}>
              {plannedFeatures.map(({ icon: Icon, label }) => (
                <Box
                  key={label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Icon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Button
              component={Link}
              href="/export"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<DownloadIcon />}
            >
              Export Your Data
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

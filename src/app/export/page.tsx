'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Button,
  MenuItem,
  Box,
  LinearProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Trip } from '@/types';
import { getTrips, getSettings, getTripCategories } from '@/lib/storage';
import { useSnackbarStore } from '@/stores/snackbar';

export default function ExportPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [includeMaps, setIncludeMaps] = useState(true);
  const [maxTripsWithMaps, setMaxTripsWithMaps] = useState('50');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const { showSnackbar } = useSnackbarStore();

  const settings = getSettings();
  const categories = getTripCategories();

  useEffect(() => {
    setTrips(getTrips());
  }, []);

  const filteredTrips = trips.filter((trip) => {
    let include = true;
    if (startDate) {
      const start = new Date(startDate).getTime();
      include = include && trip.startTime >= start;
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      include = include && trip.startTime <= end;
    }
    if (categoryFilter) {
      include = include && trip.category === categoryFilter;
    }
    return include;
  });

  const totalMiles = filteredTrips.reduce((sum, t) => sum + t.distanceMiles, 0);
  const totalReimbursement = totalMiles * settings.irsRate;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (filteredTrips.length === 0) {
      showSnackbar({ message: 'No trips found for the selected filters', severity: 'warning' });
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: filteredTrips.length });

    try {
      const { generateCSV, generatePDF, generateExcel } = await import('@/lib/export');
      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const csvContent = generateCSV(filteredTrips, settings);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `mileage-report-${dateStr}.csv`);
      } else if (format === 'pdf') {
        const maxTrips = parseInt(maxTripsWithMaps) || 50;
        const pdfBlob = await generatePDF(filteredTrips, settings, {
          includeMaps,
          maxTrips,
          onProgress: (current, total) => setExportProgress({ current, total }),
        });
        downloadBlob(pdfBlob, `mileage-report-${dateStr}.pdf`);
      } else if (format === 'excel') {
        const excelBuffer = generateExcel(filteredTrips, settings);
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        downloadBlob(blob, `mileage-report-${dateStr}.xlsx`);
      }

      showSnackbar({ message: `${format.toUpperCase()} exported successfully`, severity: 'success' });
    } catch (error) {
      showSnackbar({
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Export Trips
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              select
              label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'pdf' | 'excel')}
              fullWidth
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
            </TextField>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <TextField
              select
              label="Category Filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>

            {format === 'pdf' && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeMaps}
                      onChange={(e) => setIncludeMaps(e.target.checked)}
                    />
                  }
                  label="Include maps in PDF"
                />
                {includeMaps && (
                  <TextField
                    type="number"
                    label="Max trips with maps (1-100)"
                    value={maxTripsWithMaps}
                    onChange={(e) => setMaxTripsWithMaps(e.target.value)}
                    inputProps={{ min: 1, max: 100 }}
                    helperText="Large exports may take several minutes"
                    fullWidth
                  />
                )}
              </>
            )}

            <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Trips:</Typography>
                <Typography fontWeight={500}>{filteredTrips.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Total miles:</Typography>
                <Typography fontWeight={500}>{totalMiles.toFixed(1)} mi</Typography>
              </Box>
              {settings.showDollarAmounts && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Total reimbursement:</Typography>
                  <Typography fontWeight={500} color="success.main">
                    ${totalReimbursement.toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Box>

            {isExporting && exportProgress.total > 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Generating {format.toUpperCase()}...
                  </Typography>
                  <Typography variant="body2">
                    {exportProgress.current}/{exportProgress.total}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(exportProgress.current / exportProgress.total) * 100}
                />
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={filteredTrips.length === 0 || isExporting}
              fullWidth
            >
              {isExporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        CSV files can be opened in Excel, Google Sheets, or any spreadsheet app.
      </Typography>
    </Container>
  );
}

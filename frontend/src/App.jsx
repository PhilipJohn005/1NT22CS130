import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { log } from "../../logging-middleware/index.js";

const App = () => {
  const [forms, setForms] = useState([{ url: "", validity: "", shortcode: "" }]);
  const [results, setResults] = useState([]);

  const handleChange = (index, field, value) => {
    const newForms = [...forms];
    newForms[index][field] = value;
    setForms(newForms);
  };

  const validate = () => {
    for (const f of forms) {
      if (!f.url.trim()) {
        alert("Please enter a URL.");
        log("frontend", "warn", "validation", "User attempted to submit without a URL");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const newResults = [];

    for (const form of forms.filter((f) => f.url)) {
      try {
        log("frontend", "info", "shortening", `Attempting to shorten URL: ${form.url}`);
        const res = await fetch("http://localhost:3001/shorturls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: form.url,
            validity: parseInt(form.validity) || 60,
            shortcode: form.shortcode || undefined,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          log("frontend", "error", "shortening", `Failed to shorten URL. Status: ${res.status}, Body: ${errText}`);
          continue;
        }

        const data = await res.json();
        const parts = data.shortLink.split("/");
        const shortcode = parts[parts.length - 1];
        log("frontend", "info", "shortening", `Shortened URL created with shortcode: ${shortcode}`);

        const statsRes = await fetch(`http://localhost:3001/shorturls/${shortcode}`);
        const stats = await statsRes.json();

        newResults.push({
          original: stats.original_url,
          shortened: `http://localhost:3001/s/${shortcode}`,
          expiresAt: stats.expiry,
          clicks: stats.click_count,
          clickDetails: stats.click_details || [],
        });

        log("frontend", "debug", "stats", `Stats fetched for shortcode: ${shortcode}`);
      } catch (err) {
        console.error("Error:", err);
        log("frontend", "fatal", "submit", `Unexpected error during submission: ${err.message}`);
      }
    }

    setResults(newResults);
    log("frontend", "info", "submit", `Submission complete. Total shortened: ${newResults.length}`);
  };

  return (
    <Box sx={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <Typography variant="h4" gutterBottom>
        URL Shortener with Stats
      </Typography>

      {forms.map((form, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <TextField
            label="URL"
            fullWidth
            value={form.url}
            onChange={(e) => handleChange(index, "url", e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Validity (minutes)"
            fullWidth
            value={form.validity}
            onChange={(e) => handleChange(index, "validity", e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Custom Shortcode (optional)"
            fullWidth
            value={form.shortcode}
            onChange={(e) => handleChange(index, "shortcode", e.target.value)}
          />
        </Box>
      ))}

      <Button onClick={handleSubmit} variant="contained">
        Shorten URLs
      </Button>

      <Box sx={{ mt: 4 }}>
        {results.map((res, index) => (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Typography>
                  <a href={res.shortened} target="_blank" rel="noopener noreferrer">
                    {res.shortened}
                  </a>{" "}
                  (Clicks: {res.clicks})
                </Typography>
                <Button
                  size="small"
                  onClick={async () => {
                    const shortcode = res.shortened.split("/").pop();
                    try {
                      const statsRes = await fetch(
                        `http://localhost:3001/shorturls/${shortcode}`
                      );
                      const stats = await statsRes.json();

                      const updated = [...results];
                      updated[index] = {
                        ...res,
                        clicks: stats.click_count,
                        clickDetails: stats.click_details || [],
                      };
                      setResults(updated);

                      log("frontend", "debug", "refresh", `Stats refreshed for shortcode: ${shortcode}`);
                    } catch (err) {
                      log("frontend", "error", "refresh", `Failed to refresh stats for shortcode: ${shortcode}`);
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography>Original URL: {res.original}</Typography>
              <Typography>Expires At: {new Date(res.expiresAt).toLocaleString()}</Typography>
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Click Details:
              </Typography>
              {res.clickDetails.length ? (
                res.clickDetails.map((click, i) => (
                  <Typography key={i} sx={{ fontSize: "0.9rem", pl: 1 }}>
                    {new Date(click.timestamp).toLocaleString()} — {click.user_agent}
                  </Typography>
                ))
              ) : (
                <Typography sx={{ fontSize: "0.9rem", pl: 1 }}>No clicks yet</Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default App;

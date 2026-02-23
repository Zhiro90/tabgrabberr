// ==UserScript==
// @name         TabGrabberr
// @namespace    https://github.com/Zhiro90
// @version      1.0
// @description  Download GP files with "Artist - Title (ID)" filenames.
// @author       Zhiro90
// @match        https://www.songsterr.com/a/wsa/*
// @icon         https://www.songsterr.com/favicon.ico
// @homepageURL  https://github.com/Zhiro90/tabgrabberr
// @supportURL   https://github.com/Zhiro90/tabgrabberr/issues
// @downloadURL  https://raw.githubusercontent.com/Zhiro90/tabgrabberr/main/tabgrabberr.user.js
// @updateURL    https://raw.githubusercontent.com/Zhiro90/tabgrabberr/main/tabgrabberr.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Create the floating button
    const btn = document.createElement('button');
    btn.innerText = 'Download GP';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px 20px';
    btn.style.backgroundColor = '#C7254E';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

    document.body.appendChild(btn);

    // Helper: Sanitize filenames (remove illegal chars like / : * ? " < > |)
    function sanitizeFilename(name) {
        return name.replace(/[<>:"/\\|?*]/g, '').trim();
    }

    // 2. Define the click handler
    btn.addEventListener('click', async () => {
        const originalText = btn.innerText;
        btn.innerText = 'Scanning...';
        btn.disabled = true;

        try {
            // STEP A: Fetch the CURRENT page source freshly (SPA Fix)
            const currentUrl = window.location.href;
            const pageResponse = await fetch(currentUrl);

            if (!pageResponse.ok) throw new Error("Could not fetch page data.");

            const htmlText = await pageResponse.text();

            // STEP B: Parse the fetched HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const stateScript = doc.getElementById('state');

            if (!stateScript) throw new Error("State data not found.");

            // STEP C: Parse JSON & Extract Info
            const stateData = JSON.parse(stateScript.textContent);
            const currentData = stateData?.meta?.current;

            const revisionId = currentData?.revisionId;
            const songId = currentData?.songId;
            const artist = currentData?.artist || "Unknown Artist";
            const title = currentData?.title || "Unknown Song";

            if (!revisionId) throw new Error("Could not find revisionId.");

            console.log(`Found: ${artist} - ${title} (ID: ${songId})`);
            btn.innerText = 'Getting Link...';

            // STEP D: Call API for the Download Link
            const apiResponse = await fetch(`https://www.songsterr.com/api/revision/${revisionId}`);
            if (!apiResponse.ok) throw new Error(`API Error: ${apiResponse.status}`);

            const apiJson = await apiResponse.json();
            const downloadUrl = apiJson.source;

            if (!downloadUrl) throw new Error("No GP file source found.");

            // STEP E: Construct Filename
            // Get extension from URL (usually .gp, .gp5, .gpx) or default to .gp
            const ext = downloadUrl.split('.').pop() || 'gp';
            const cleanArtist = sanitizeFilename(artist);
            const cleanTitle = sanitizeFilename(title);
            const filename = `${cleanArtist} - ${cleanTitle} (${songId}).${ext}`;

            btn.innerText = 'Downloading...';

            // STEP F: Fetch File as Blob (Required for Renaming)
            const fileResponse = await fetch(downloadUrl);
            if (!fileResponse.ok) throw new Error("Download failed (CORS/Network).");

            const blob = await fileResponse.blob();
            const blobUrl = URL.createObjectURL(blob);

            // STEP G: Trigger Save
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);

            btn.innerText = 'Success!';

        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
            btn.innerText = 'Error';
        } finally {
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 3000);
        }
    });

})();
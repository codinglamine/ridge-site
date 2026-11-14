// TEMPORARY: hands out a one-time client upload token for the beta installer.
// Locked with BETA_PASSWORD; remove this file once the installer is uploaded.
const { handleUpload } = require("@vercel/blob/client");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  try {
    const out = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!process.env.BETA_PASSWORD || clientPayload !== process.env.BETA_PASSWORD) throw new Error("Not allowed.");
        if (!/^beta\/[A-Za-z0-9._-]+\.exe$/.test(pathname)) throw new Error("Bad file name.");
        return { addRandomSuffix: true, maximumSizeInBytes: 250 * 1024 * 1024, allowOverwrite: false };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(400).json({ error: String((e && e.message) || e) });
  }
};

// GET /api/github
// File terpisah khusus GitHub. Pakai GITHUB_TOKEN (Personal Access
// Token / API key) langsung — bukan webhook. Token hanya hidup di
// environment variable server, tidak pernah dikirim ke browser.
module.exports = async function handler(req, res) {
  const config = require("./_lib/config");
  const token = config.GITHUB_TOKEN;

  if (!token) {
    return res.status(200).json({ configured: false, user: null, repos: [] });
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "wanzz-deploy",
      Accept: "application/vnd.github+json",
    };

    const [userRes, reposRes] = await Promise.all([
      fetch("https://api.github.com/user", { headers }),
      fetch("https://api.github.com/user/repos?sort=updated&per_page=20", { headers }),
    ]);

    if (!userRes.ok || !reposRes.ok) {
      return res.status(502).json({
        configured: true,
        error: `GitHub API error (user:${userRes.status}, repos:${reposRes.status})`,
      });
    }

    const user = await userRes.json();
    const reposData = await reposRes.json();
    const repos = reposData.map((r) => ({
      fullName: r.full_name,
      name: r.name,
      branch: r.default_branch,
      language: r.language || "—",
      private: r.private,
      updatedAt: r.updated_at,
    }));

    res.status(200).json({ configured: true, user: user.login, repos });
  } catch (err) {
    res.status(500).json({
      configured: true,
      error: "Gagal menghubungi GitHub API dari server.",
      detail: String(err),
    });
  }
};

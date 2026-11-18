const { API_BASE_URL } = require("../config");

function request(path, method = "GET", data = {}, token = "") {
  return new Promise((resolve, reject) => wx.request({
    url: `${API_BASE_URL}${path}`,
    method,
    data,
    header: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    success(res) {
      if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
      else reject(new Error((res.data && res.data.message) || `接口返回 ${res.statusCode}`));
    },
    fail(error) { reject(new Error(error.errMsg || "接口暂不可用")); }
  }));
}

module.exports = {
  listScores: () => request("/api/scores"),
  login: password => request("/api/admin/login", "POST", { password }),
  createScore: (entry, token) => request("/api/scores", "POST", entry, token),
  updateScore: (id, entry, token) => request(`/api/scores/${encodeURIComponent(id)}`, "PUT", entry, token)
};

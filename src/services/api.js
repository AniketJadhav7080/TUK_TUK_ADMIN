const API_BASE = 'https://impish-earwig-epiphany.ngrok-free.dev/api';

function toQuery(obj) {
  if (typeof obj === 'string') return obj;
  const entries = Object.entries(obj || {}).filter(([, v]) => v !== '' && v !== undefined);
  return entries.length ? '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
}

async function request(endpoint, options = {}) {
  const token = sessionStorage.getItem('admin_token');
  const isFormData = options.body instanceof FormData
  const headers = { 'ngrok-skip-browser-warning': 'true', ...options.headers };
  if (!isFormData) headers['Content-Type'] = 'application/json'
  else delete headers['Content-Type']
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const { skipRedirect, ...fetchOptions } = options;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });
  if (!res.ok) {
    if (res.status === 401 && !skipRedirect) { sessionStorage.removeItem('admin_token'); window.location.href = '/login'; }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email, newPassword) => request('/auth/platform-owner/forgot-password', { method: 'POST', body: JSON.stringify({ email, newPassword }) }),
  changePassword: (email, currentPassword, newPassword) => request('/auth/platform-owner/change-password', { method: 'POST', body: JSON.stringify({ email, currentPassword, newPassword }) }),

  // Dashboard
  getDashboard: () => request('/dashboard'),
  getDashboardStats: () => request('/dashboard/stats'),
  getDashboardCharts: () => request('/dashboard/charts'),

  // Platform Owner
  getOwnerDashboard: () => request('/platform-owner/dashboard'),
  getOwnerCountries: () => request('/platform-owner/countries'),
  getOwnerCountry: (code) => request(`/platform-owner/countries/${code}`),
  updateCountryStatus: (code, data) => request(`/platform-owner/countries/${code}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  getOwnerCountrySupport: (code, page = 0, size = 20) => request(`/platform-owner/countries/${code}/support?page=${page}&size=${size}`),
  getOwnerCountryRooms: (code) => request(`/platform-owner/countries/${code}/rooms`),
  closeOwnerCountryRoom: (code, roomId) => request(`/platform-owner/countries/${code}/rooms/${roomId}/close`, { method: 'POST' }),
  getPlatformOwnerRooms: () => request('/platform-owner/rooms'),
  getActiveRoomsCount: () => request('/platform-owner/rooms/active/count'),
  getRoomCategoriesCount: () => request('/platform-owner/rooms/categories/count'),
  getTotalParticipantsCount: () => request('/platform-owner/rooms/participants/count'),
  listAdmins: () => request('/platform-owner/admins'),
  getAssignableRoles: () => request('/platform-owner/admins/roles'),
  addAdmin: (data) => request('/platform-owner/admins', { method: 'POST', body: JSON.stringify(data) }),
  removeAdmin: (id) => request(`/platform-owner/admins/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: (params = '') => request(`/users${toQuery(params)}`),
  getUser: (id) => request(`/users/${id}`),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateUserStatus: (id, data) => request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateUserVip: (id, data) => request(`/users/${id}/vip`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Hosts
  getHosts: (params = '') => request(`/hosts${toQuery(params)}`),
  approveHost: (id) => request(`/hosts/approve/${id}`, { method: 'POST' }),
  updateHostApproval: (id, data) => request(`/hosts/${id}/approve`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Rooms (Nikita admin)
  getAdminRooms: () => request('/admin/rooms'),
  getRooms: () => request('/rooms'),
  getLiveRooms: () => request('/rooms/live'),
  getActiveRooms: () => request('/rooms/active'),
  getCountryRoomsByCode: (code) => request(`/country/${code}/rooms`),
  closeRoom: (id) => request(`/admin/rooms/${id}/close`, { method: 'POST', body: JSON.stringify({ reason: 'Policy violation' }) }),
  closeAdminRoom: (id, reason = 'Policy violation') => request(`/admin/rooms/${id}/close`, { method: 'POST', body: JSON.stringify({ reason }) }),
  muteAllRoom: (id) => request(`/rooms/${id}/mute-all`, { method: 'POST' }),
  kickUser: (roomId, userId) => request(`/rooms/${roomId}/kick/${userId}`, { method: 'POST' }),
  muteKick: (roomId, data) => request(`/rooms/${roomId}/mute-kick`, { method: 'POST', body: JSON.stringify(data) }),
  deactivateRoom: (id) => request(`/admin/rooms/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active: false }) }),
  activateRoom: (id) => request(`/admin/rooms/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active: true }) }),
  deactivateCountryRoom: (countryCode, roomId, active = false) => request(`/admin/rooms/${roomId}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  deleteRoom: (id) => request(`/admin/rooms/${id}`, { method: 'DELETE' }),
  deleteCountryRoom: (countryCode, roomId) => request(`/admin/rooms/${roomId}`, { method: 'DELETE' }),
  transferHost: (id, data) => request(`/admin/rooms/${id}/host`, { method: 'PATCH', body: JSON.stringify({ hostId: data.newHostId || data.hostId }) }),
  transferCountryHost: (countryCode, roomId, data) => request(`/admin/rooms/${roomId}/host`, { method: 'PATCH', body: JSON.stringify({ hostId: data.newHostId || data.hostId }) }),
  unmuteUser: (roomId, userId) => request(`/rooms/${roomId}/unmute/${userId}`, { method: 'POST' }),
  getVoiceLogs: () => request('/rooms/voice-logs'),

  // Diamond Allocation
  // Owner → Super Admin (Shivam's platform-owner endpoints)
  getOwnerDiamondSummary: () => request('/platform-owner/admin-diamond-credits/summary'),
  ownerAllocateDiamond: (data) => request('/platform-owner/admin-diamond-credits', { method: 'POST', body: JSON.stringify(data) }),
  getOwnerDiamondHistory: (page = 0, size = 20) => request(`/platform-owner/admin-diamond-credits?page=${page}&size=${size}`),
  // Super Admin → Diamond Stock Manager (Shivam's endpoints)
  getSuperAdminStockSummary: () => request('/super-admin/diamond-stock/summary'),
  superAdminDistribute: (data) => request('/super-admin/diamond-stock/distribute', { method: 'POST', body: JSON.stringify(data) }),
  getSuperAdminHistory: () => request('/super-admin/diamond-stock/history'),
  // Diamond Stock Manager
  getManagerDiamondSummary: () => request('/diamond-stock-manager/diamond-stock/summary'),
  getManagerUser: (userId) => request(`/diamond-stock-manager/users/${userId}`),
  managerWalletRecharge: (data) => request('/diamond-stock-manager/wallet/recharge', { method: 'POST', body: JSON.stringify(data) }),
  getManagerRechargeHistory: () => request('/diamond-stock-manager/wallet/recharge/history'),

  // Legacy diamond endpoints (kept for compatibility)
  getDiamondStock: () => request('/diamond-stock'),
  getDiamondTransactions: (page = 0, size = 20) => request(`/diamond/transactions?page=${page}&size=${size}`),
  getCreditRequests: (page = 0, size = 20) => request(`/diamond/credit-requests?page=${page}&size=${size}`),
  approveCreditRequest: (id, data) => request(`/diamond/credit-requests/${id}/action`, { method: 'POST', body: JSON.stringify(data) }),
  approveRecharge: (id) => request(`/recharges/${id}/approve`, { method: 'POST' }),

  // Gifts
  getGifts: () => request('/gifts'),
  getDailyGifts: () => request('/gifts/daily'),
  createGift: (data) => request('/gifts', { method: 'POST', body: JSON.stringify(data) }),
  updateGift: (id, data) => request(`/gifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchGift: (id, data) => request(`/gifts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Agency
  getAgencies: () => request('/agencies'),
  getCommissions: () => request('/agencies/commissions'),
  getSalaries: () => request('/agencies/salaries'),
  getAgencyPerformance: () => request('/agencies/performance'),
  recruitHost: (data) => request('/agencies/recruit', { method: 'POST', body: JSON.stringify(data) }),

  // Host Panel
  withdrawHost: (data) => request('/host/withdraw', { method: 'POST', body: JSON.stringify(data) }),

  // Security
  getSecurityAlerts: () => request('/security/alerts'),
  getFraudAlerts: () => request('/security/fraud-alerts'),
  blockIp: (data) => request('/security/block-ip', { method: 'POST', body: JSON.stringify(data) }),

  // Events (Nikita admin)
  getEvents: () => request('/admin/events'),
  createEvent: (data, imageFile) => {
    const fd = new FormData()
    const payload = { name: data.name, description: data.description, startDate: data.startDate, endDate: data.endDate, rewards: Number(data.rewards ?? data.reward ?? 0), hostName: data.hostName, eventType: data.eventType || data.type, countryCode: data.countryCode || 'IN' }
    fd.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (imageFile) fd.append('image', imageFile)
    return request('/admin/events', { method: 'POST', body: fd, headers: {} })
  },
  updateEvent: (id, data) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/admin/events/${id}`, { method: 'DELETE' }),
  notifyEvent: (id) => request(`/admin/events/notify/${id}`),

  // Notifications
  getNotificationHistory: () => request('/notifications/history'),
  sendNotification: (data) => {
    const fd = new FormData()
    if (data.image) { fd.append('image', data.image); delete data.image }
    fd.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    return request('/notifications/mass', { method: 'POST', body: fd, headers: {} })
  },
  sendMassNotification: (data, image) => {
    const fd = new FormData()
    const payload = { title: data.title, body: data.message || data.body, recipient: data.recipient || 'ALL_USERS', type: data.type }
    if (image) fd.append('image', image)
    else if (data.image) fd.append('image', data.image)
    fd.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    return request('/notifications/mass', { method: 'POST', body: fd, headers: {} })
  },

  // Payments
  getPaymentGateways: () => request('/payments/gateways'),
  updatePaymentGateway: (id, data) => request(`/payments/gateways/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPaymentTransactions: (params = '') => request(`/payments/transactions${toQuery(params)}`),

  // Reports
  getReports: (params = '') => request(`/reports${toQuery(params)}`),
  resolveReport: (id, data) => request(`/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),

  // Staff / Admins
  getStaffMe: () => request('/staff/me'),
  getAdmins: () => request('/admins'),
  createAdmin: (data) => request('/admins', { method: 'POST', body: JSON.stringify(data) }),
  deleteAdmin: (id) => request(`/admins/${id}`, { method: 'DELETE' }),
  getStaff: () => request('/staff'),
  createStaff: (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getCountries: () => request('/countries'),

  // Decorations (badges/frames)
  getAdminDecorations: (adminId) => request(`/admin/decorations/${adminId}`, { skipRedirect: true }),
  getDecorationCounts: () => request('/admin/decorations/counts'),
  getBadgesCount: () => request('/admin/decorations/badges/count', { skipRedirect: true }),
  getFramesCount: () => request('/admin/decorations/frames/count', { skipRedirect: true }),
  giveAdminBadge: (adminId, badgeName) => request(`/admin/decorations/${adminId}/badge?badgeName=${encodeURIComponent(badgeName)}`, { method: 'POST', skipRedirect: true }),
  removeAdminBadge: (adminId) => request(`/admin/decorations/${adminId}/badge`, { method: 'DELETE', skipRedirect: true }),
  giveAdminFrame: (adminId, frameName) => request(`/admin/decorations/${adminId}/frame?frameName=${encodeURIComponent(frameName)}`, { method: 'POST', skipRedirect: true }),
  removeAdminFrame: (adminId) => request(`/admin/decorations/${adminId}/frame`, { method: 'DELETE', skipRedirect: true }),

  // Gamification
  getGamificationItems: () => request('/gamification/items'),
  updateGamificationItems: (data) => request('/gamification/items', { method: 'PUT', body: JSON.stringify(data) }),
  getGamificationUser: (id) => request(`/gamification/users/${id}`),
  grantGamificationItem: (data) => request('/gamification/users/grant-item', { method: 'POST', body: JSON.stringify(data) }),
  evaluateGamification: (data) => request('/gamification/evaluate', { method: 'POST', body: JSON.stringify(data) }),

  // Country Handler
  getCountriesStats: () => request('/countries/stats'),
  getCountryStats: (code) => request(`/country/${code}/stats`),
  getCountrySupport: (code, page = 0, size = 20) => request(`/country/${code}/support?page=${page}&size=${size}`),
  getCountryRooms: (code) => request(`/country/${code}/rooms`),
  getCountryHosts: (code, params = '') => request(`/country/${code}/hosts${toQuery(params)}`),
  approveCountryHost: (countryCode, hostId, data) => request(`/country/${countryCode}/hosts/${hostId}/approve`, { method: 'PATCH', body: JSON.stringify(data) }),
  closeCountryRoom: (countryCode, roomId) => request(`/country/${countryCode}/rooms/${roomId}/close`, { method: 'POST' }),
  resolveCountrySupport: (countryCode, reportId, data) => request(`/country/${countryCode}/support/${reportId}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
  getCountryRevenue: (code) => request(`/country/${code}/revenue`),

  // Host Panel
  getHostEarnings: () => request('/host/earnings'),
  getHostPkBattles: () => request('/host/pk-battles'),
  getHostFollowers: () => request('/host/followers'),

  // Tickets
  getTickets: (params = '') => request(`/tickets${toQuery(params)}`),
  getTicketMessages: (id) => request(`/tickets/${id}/messages`),
  sendTicketMessage: (id, data) => request(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  updateTicketStatus: (id, data) => request(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAppFollowers: (userId) => request(`/relationships/followers?userId=${userId}`),

  // Clans
  getClans: () => request('/clans'),
  createClan: (data) => request('/clans', { method: 'POST', body: JSON.stringify(data) }),
  updateClan: (id, data) => request(`/clans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClan: (id) => request(`/clans/${id}`, { method: 'DELETE' }),
  addClanMember: (clanId, data) => request(`/clans/${clanId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeClanMember: (clanId, userId) => request(`/clans/${clanId}/members/${userId}`, { method: 'DELETE' }),

  // Nearby Rooms
  getNearbyRooms: (params = '') => request(`/nearby-rooms${toQuery(params)}`),
  joinNearbyRoom: (id) => request(`/nearby-rooms/${id}/join`, { method: 'POST' }),

  // Dating
  getDatingProfiles: () => request('/dating/profiles'),
  updateDatingProfile: (id, data) => request(`/dating/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getDatingMatches: () => request('/dating/matches'),
  createDatingMatch: (data) => request('/dating/match', { method: 'POST', body: JSON.stringify(data) }),

  // AI Moderation
  getAiModerationFlags: () => request('/ai-moderation/flags'),
  resolveAiFlag: (id, data) => request(`/ai-moderation/flags/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) }),

  // VIP Plans
  getVipInfo: () => request('/app/vip/vip-info'),
  getVipConfig: () => request('/app/vip/config'),
  updateVipConfig: (data) => request('/app/vip/config', { method: 'PUT', body: JSON.stringify(data) }),
  getVipPlans: () => request('/vip/plans'),
  createVipPlan: (data) => request('/vip/plans', { method: 'POST', body: JSON.stringify(data) }),
  updateVipPlan: (id, data) => request(`/vip/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVipPlan: (id) => request(`/vip/plans/${id}`, { method: 'DELETE' }),

  // Host Gift Revenue
  getHostGiftRevenue: () => request('/host/gift-revenue'),

  // Daily Missions
  getMissions: () => request('/missions'),
  createMission: (data) => request('/missions', { method: 'POST', body: JSON.stringify(data) }),
  updateMission: (id, data) => request(`/missions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMission: (id) => request(`/missions/${id}`, { method: 'DELETE' }),

  // Achievement Badges
  getBadges: () => request('/badges', { skipRedirect: true }),
  createBadge: (data) => request('/badges', { method: 'POST', body: JSON.stringify(data) }),
  updateBadge: (id, data) => request(`/badges/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBadge: (id) => request(`/badges/${id}`, { method: 'DELETE' }),
};

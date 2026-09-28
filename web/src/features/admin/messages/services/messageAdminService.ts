import { messageAdminApi } from '../api/messageAdminApi';

export const messageAdminService = {
  getStats: messageAdminApi.getStats,

  getUsers: messageAdminApi.getUsers,

  getFockisIdPricing: messageAdminApi.getFockisIdPricing,

  updateFockisIdPricing:
    messageAdminApi.updateFockisIdPricing,

  getFockisIdSettings:
    messageAdminApi.getFockisIdSettings,

  updateFockisIdSettings:
    messageAdminApi.updateFockisIdSettings,

  getMessageSettings:
    messageAdminApi.getMessageSettings,

  updateMessageSettings:
    messageAdminApi.updateMessageSettings,

  getCallSettings:
    messageAdminApi.getCallSettings,

  updateCallSettings:
    messageAdminApi.updateCallSettings,

  getAttachmentSettings:
    messageAdminApi.getAttachmentSettings,

  updateAttachmentSettings:
    messageAdminApi.updateAttachmentSettings,

  getReports:
    messageAdminApi.getReports,

  updateReportStatus:
    messageAdminApi.updateReportStatus,
};

export default messageAdminService;
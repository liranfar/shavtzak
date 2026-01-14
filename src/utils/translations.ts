// Hebrew UI translations

export const labels = {
  // App
  appName: 'שווצק',
  appDescription: 'מערכת ניהול משמרות',

  // Navigation
  dashboard: 'דשבורד',
  schedule: 'לוח משמרות',
  soldiers: 'חיילים',
  missions: 'משימות',
  settings: 'הגדרות',

  // Soldier status
  status: {
    available: 'זמין',
    home: 'בבית',
    task_locked: 'תפוס במשימה',
    sick: 'חולה',
  },

  // Roles
  roles: {
    officer: 'קצין',
    nco: 'מפקד',
    soldier: 'חייל',
  },

  // Mission types
  missionTypes: {
    A_continuous: 'משמרת רציפה (24/7)',
    C_adhoc: 'משימה מיידית',
  },

  // Shift status
  shiftStatus: {
    scheduled: 'מתוכנן',
    active: 'פעיל',
    completed: 'הושלם',
    cancelled: 'בוטל',
  },

  // Validation messages
  validation: {
    duplicate: 'החייל משובץ במשימה אחרת בזמן זה',
    restViolation: 'הפרת מנוחה - פחות מ-8 שעות',
    unavailable: 'החייל לא זמין',
  },

  // Actions
  actions: {
    save: 'שמור',
    cancel: 'ביטול',
    add: 'הוסף',
    edit: 'ערוך',
    delete: 'מחק',
    close: 'סגור',
    confirm: 'אישור',
    search: 'חיפוש',
    filter: 'סינון',
    export: 'ייצוא',
    import: 'ייבוא',
  },

  // Form labels
  form: {
    name: 'שם',
    personalNumber: 'מספר אישי',
    role: 'תפקיד',
    status: 'סטטוס',
    platoon: 'מחלקה',
    squad: 'כיתה',
    missionName: 'שם משימה',
    missionType: 'סוג משימה',
    intensity: 'עוצמה',
    requiredSoldiers: 'מספר חיילים נדרש',
    startTime: 'שעת התחלה',
    endTime: 'שעת סיום',
  },

  // Dashboard
  dashboard_labels: {
    totalSoldiers: 'סה״כ חיילים',
    availableSoldiers: 'חיילים זמינים',
    activeMissions: 'משימות פעילות',
    todayShifts: 'משמרות היום',
    fairnessScore: 'ציון שוויון',
    weeklyLoad: 'עומס שבועי',
  },

  // Time
  time: {
    today: 'היום',
    tomorrow: 'מחר',
    yesterday: 'אתמול',
    hours: 'שעות',
    minutes: 'דקות',
  },

  // Messages
  messages: {
    noData: 'אין נתונים להצגה',
    loading: 'טוען...',
    saved: 'נשמר בהצלחה',
    deleted: 'נמחק בהצלחה',
    error: 'אירעה שגיאה',
    confirmDelete: 'האם אתה בטוח שברצונך למחוק?',
  },
} as const;

// Helper function for status labels
export function getStatusLabel(status: string): string {
  return labels.status[status as keyof typeof labels.status] || status;
}

// Helper function for role labels
export function getRoleLabel(role: string): string {
  return labels.roles[role as keyof typeof labels.roles] || role;
}

// Helper function for mission type labels
export function getMissionTypeLabel(type: string): string {
  return labels.missionTypes[type as keyof typeof labels.missionTypes] || type;
}

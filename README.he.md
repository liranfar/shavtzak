# שבצ״ק - מדריך התקנה ופריסה

מדריך זה מיועד למי שרוצה להפעיל עותק עצמאי של מערכת שבצ״ק לשימוש פנימי.
אין צורך בידע טכני מעמיק - פשוט עקבו אחר השלבים.

## מה צריך לפני שמתחילים

- חשבון GitHub (חינם) - [הרשמה](https://github.com/signup)
- חשבון Supabase (חינם) - [הרשמה](https://supabase.com)
- חשבון Vercel (חינם) - [הרשמה](https://vercel.com/signup)

---

## שלב 1: העתקת הקוד ל-GitHub שלכם (Fork)

1. היכנסו לדף הפרויקט: https://github.com/liranfar/shavtzak
2. לחצו על כפתור **Fork** בפינה הימנית העליונה
3. בחרו את החשבון שלכם ולחצו **Create fork**
4. המתינו עד שההעתקה תסתיים - תועברו לעותק שלכם

> **הסבר**: Fork יוצר עותק של הפרויקט תחת החשבון שלכם, כך שתוכלו לעשות בו שינויים.

---

## שלב 2: יצירת בסיס נתונים ב-Supabase

### 2.1 יצירת פרויקט חדש

1. היכנסו ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. לחצו על **New Project**
3. מלאו את הפרטים:
   - **Name**: שם לפרויקט (למשל: `shavtzak-myunit`)
   - **Database Password**: בחרו סיסמה חזקה (שמרו אותה!)
   - **Region**: בחרו `Frankfurt (eu-central-1)` (הכי קרוב לישראל)
4. לחצו **Create new project**
5. המתינו 2-3 דקות עד שהפרויקט יווצר

### 2.2 הקמת הטבלאות בבסיס הנתונים

1. בתפריט השמאלי, לחצו על **SQL Editor**
2. לחצו על **New query**
3. פתחו קישור זה בלשונית חדשה: [קובץ schema.sql](https://raw.githubusercontent.com/liranfar/shavtzak/main/supabase/schema.sql)
4. העתיקו את כל התוכן (Ctrl+A ואז Ctrl+C)
5. חזרו ל-Supabase והדביקו בעורך (Ctrl+V)
6. לחצו על **Run** (או F5)
7. ודאו שהריצה הצליחה - תראו הודעת `Success`

> **טיפ**: אם יש שגיאה, נסו לרענן את הדף ולהריץ שוב.

### 2.3 הוספת נתונים לדוגמה (אופציונלי)

אם רוצים להתחיל עם נתונים לדוגמה (חיילים, משימות וכו'):

1. בעורך SQL, לחצו על **New query**
2. פתחו קישור זה: [קובץ seed.sql](https://raw.githubusercontent.com/liranfar/shavtzak/main/supabase/seed.sql)
3. העתיקו, הדביקו והריצו כמו בשלב הקודם

### 2.4 יצירת משתמש ראשון

1. בתפריט השמאלי, לחצו על **Authentication**
2. לחצו על הלשונית **Users**
3. לחצו על **Add user** ואז **Create new user**
4. מלאו:
   - **Email**: כתובת המייל שלכם
   - **Password**: סיסמה (לפחות 6 תווים)
   - סמנו את **Auto Confirm User**
5. לחצו **Create user**

> **חשוב**: זו תהיה כתובת המייל והסיסמה לכניסה למערכת.

### 2.5 שמירת פרטי ההתחברות

1. בתפריט השמאלי, לחצו על **Project Settings** (גלגל השיניים)
2. לחצו על **API**
3. העתיקו ושמרו את הערכים הבאים (תצטרכו אותם בשלב הבא):
   - **Project URL** - נראה כך: `https://xxxxx.supabase.co`
   - **anon public** (תחת Project API keys) - מפתח ארוך

---

## שלב 3: פריסה ב-Vercel

### 3.1 חיבור הפרויקט

1. היכנסו ל-[Vercel Dashboard](https://vercel.com/dashboard)
2. לחצו על **Add New...** ואז **Project**
3. תחת **Import Git Repository**, מצאו את `shavtzak` שעשיתם לו Fork
   - אם לא רואים, לחצו על **Adjust GitHub App Permissions**
4. לחצו **Import** ליד הפרויקט

### 3.2 הגדרת משתני סביבה

בדף **Configure Project**:

1. פתחו את הקטע **Environment Variables**
2. הוסיפו את המשתנים הבאים:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | ה-Project URL מ-Supabase (מתחיל ב-https://) |
| `VITE_SUPABASE_ANON_KEY` | ה-anon public key מ-Supabase |

3. לחצו **Deploy**
4. המתינו 1-2 דקות עד שהפריסה תסתיים

### 3.3 גישה לאפליקציה

לאחר הפריסה:
1. לחצו על התמונה המקדימה או על **Visit** כדי לפתוח את האפליקציה
2. היכנסו עם המייל והסיסמה שיצרתם בשלב 2.4
3. מזל טוב! המערכת מוכנה לשימוש

> **הכתובת שלכם**: תהיה בפורמט `https://shavtzak-xxxxx.vercel.app`
> ניתן לשנות אותה בהגדרות הפרויקט ב-Vercel תחת Domains.

---

## הוספת משתמשים נוספים

להוספת משתמשים שיוכלו להיכנס למערכת:

1. היכנסו ל-Supabase Dashboard
2. לכו ל-**Authentication** > **Users**
3. לחצו **Add user** > **Create new user**
4. מלאו מייל וסיסמה, סמנו **Auto Confirm User**
5. שתפו את פרטי הכניסה עם המשתמש

---

## פתרון בעיות נפוצות

### "Invalid login credentials"
- ודאו שהמייל והסיסמה נכונים
- ודאו שהמשתמש נוצר עם Auto Confirm מסומן

### הדף ריק / שגיאת טעינה
- בדקו שמשתני הסביבה ב-Vercel הוגדרו נכון
- ודאו שה-URL מתחיל ב-`https://` (לא `http://`)
- נסו לפרוס מחדש: ב-Vercel לכו ל-Deployments ולחצו Redeploy

### "permission denied" או בעיות גישה לנתונים
- הריצו שוב את קובץ schema.sql ב-Supabase
- ודאו שהרצתם את כל הקובץ ולא חלק ממנו

### המערכת לא מציגה נתונים
- ודאו שהריצתם את schema.sql
- אם רוצים נתונים לדוגמה, הריצו גם את seed.sql

---

## מידע טכני נוסף

- **קוד המקור**: https://github.com/liranfar/shavtzak
- **תיעוד Supabase**: https://supabase.com/docs
- **תיעוד Vercel**: https://vercel.com/docs

---

## רישיון

השימוש במערכת הוא לשימוש פנימי בלבד.

© 2026 Liran Farage. All rights reserved.

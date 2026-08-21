# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase1-homepage.spec.ts >> Phase 1: Homepage & Navigation >> should display PrincipalTimeSavedCard
- Location: e2e\phase1-homepage.spec.ts:105:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Saved by Nigerian School Principals')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Saved by Nigerian School Principals')

```

```yaml
- navigation:
  - text: Gradifi SEFAES
  - button "Dashboard ▾"
  - button "Sign In"
  - button "Get Started"
- text: NDPR Certified Offline-First Trusted by 10+ Nigerian Schools
- heading "Academic Intelligence for Nigerian Schools" [level=1]
- paragraph: AI grading, offline-first CBT exams, and academic writing tools — trusted by Nigerian secondary schools. Free for teachers and students.
- button "Start Free Trial – We'll Call to Help"
- button "View Demo"
- text: 100% Free Academic Writing Tools No Registration Required
- link "📝 Word Counter":
  - /url: /tools/word-counter
  - text: 📝
  - paragraph: Word Counter
- link "🔄 Paraphraser":
  - /url: /tools/paraphraser
  - text: 🔄
  - paragraph: Paraphraser
- link "📖 Readability":
  - /url: /tools/readability-checker
  - text: 📖
  - paragraph: Readability
- link "📚 Citation Builder":
  - /url: /tools/citation-generator
  - text: 📚
  - paragraph: Citation Builder
- link "📄 Summarizer":
  - /url: /tools/summarizer
  - text: 📄
  - paragraph: Summarizer
- text: No credit card 14-day free trial Cancel anytime
- img "Nigerian students learning"
- paragraph: WAEC & NECO Aligned
- paragraph: 99.4% Accuracy
- heading "🤖 Human-in-the-Loop AI Grading" [level=2]
- text: 🤖
- heading "AI Drafts Rubric" [level=3]
- paragraph: AI generates transparent draft rubrics in seconds following WAEC/NECO marking schemes.
- text: 👩‍🏫
- heading "Teacher Reviews" [level=3]
- paragraph: Teachers review, adjust sliders, and verify every single score before releasing grades.
- text: ✅
- heading "Approve & Release" [level=3]
- paragraph: Teachers approve or override scores with mandatory justification and audit trail.
- text: ⭐ Save 12 hours per term on grading
- heading "Real Impact for School Principals" [level=2]
- img "Principal Smiling"
- text: Live Network Impact
- heading "Alhaji M. Ibrahim" [level=4]
- paragraph: Principal, Standard Academy
- text: Admin Time Recovered 1,026 Hours +1 hr recorded every few mins
- paragraph: “Gradifi cut our term-end broadsheet compilation from 3 weeks down to 1 afternoon.”
- text: 35+ Schools Active
- heading "Teacher Empowerment" [level=2]
- paragraph: AI Speed with Total Teacher Authority. Gradifi never automates grading blindly. AI generates transparent draft rubrics in seconds — your teachers review, adjust, and approve every single score.
- img "Teacher"
- paragraph: — Senior Literature Teacher
- paragraph: Federal Government College, Lagos
- text: "Gradifi AI Draft Complete Confidence:"
- strong: High (96%)
- text: "AP Literature Essay #3"
- heading "Marcus Vance — \"The Great Gatsby Symbolism\"" [level=3]
- text: Proposed Grade 88/100 Thesis & Argumentation Rubric Criteria
- paragraph: Clear central claim; strong contextualization of the green light motif.
- spinbutton: "28"
- text: /30 Evidence & Textual Support Rubric Criteria
- paragraph: Direct quotes integrated cleanly in paragraphs 2 and 4. Minor citation format issue.
- spinbutton: "32"
- text: /35 Structure & Mechanics Rubric Criteria
- paragraph: Flawless transitions and varied sentence structure throughout.
- spinbutton: "28"
- text: /35
- img "Teacher avatar"
- text: Ms. Davis
- paragraph: Teacher has final authority
- button "Override Grade"
- button "Approve & Release"
- paragraph: Gradifi structures feedback and calculates criteria scores instantly. You review, tweak, and approve every release.
- heading "📶 Offline CBT Examinations" [level=2]
- img "CBT Lab"
- text: 📱
- heading "Works Offline" [level=3]
- paragraph: Students complete exams without active internet connection.
- text: 🔄
- heading "Auto-Sync" [level=3]
- paragraph: Results and attempt logs sync automatically when network connectivity is restored.
- text: ⏱️
- heading "Live Timer" [level=3]
- paragraph: Built-in countdown timer with automatic answer submission on time-up.
- text: Offline Mode Active • Auto-sync • No internet needed
- contentinfo:
  - paragraph: © 2026 Gradifi • SEFAES Constitutional Engineering System
  - paragraph: Built for Nigerian secondary schools • NDPR Compliant
```

# Test source

```ts
  9   | }
  10  | 
  11  | /**
  12  |  * GRADIFI / SEFAES - PHASE 1: HOMEPAGE & NAVIGATION
  13  |  * Constitutional Law 11: Evidence Over Assumption
  14  |  */
  15  | test.describe('Phase 1: Homepage & Navigation', () => {
  16  | 
  17  |   test.beforeAll(async () => {
  18  |     if (!fs.existsSync(outDir)) {
  19  |       fs.mkdirSync(outDir, { recursive: true });
  20  |     }
  21  |   });
  22  |   
  23  |   test.beforeEach(async ({ page }) => {
  24  |     await page.goto('/');
  25  |     await page.waitForLoadState('networkidle');
  26  |   });
  27  | 
  28  |   // =============================================
  29  |   // TEST 1: Full Homepage Screenshot
  30  |   // =============================================
  31  |   test('should capture full homepage screenshot', async ({ page }) => {
  32  |     await page.screenshot({ 
  33  |       path: getImgPath('01-homepage-full.png'), 
  34  |       fullPage: true 
  35  |     });
  36  |   });
  37  | 
  38  |   // =============================================
  39  |   // TEST 2: Navigation Bar
  40  |   // =============================================
  41  |   test('should display navigation bar with correct elements', async ({ page }) => {
  42  |     const navLogo = page.locator('nav').getByText('Gradifi', { exact: true });
  43  |     await expect(navLogo).toBeVisible();
  44  |     await expect(page.locator('nav').locator('text=SEFAES')).toBeVisible();
  45  |     await expect(page.locator('button', { hasText: 'Dashboard' })).toBeVisible();
  46  |     await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();
  47  |     await expect(page.locator('button', { hasText: 'Get Started' })).toBeVisible();
  48  |     
  49  |     await page.screenshot({ 
  50  |       path: getImgPath('02-navigation-bar.png'), 
  51  |       fullPage: false 
  52  |     });
  53  |   });
  54  | 
  55  |   // =============================================
  56  |   // TEST 3: Trust Badges
  57  |   // =============================================
  58  |   test('should display all three trust badges', async ({ page }) => {
  59  |     await expect(page.locator('text=NDPR Certified').first()).toBeVisible();
  60  |     await expect(page.locator('text=Offline-First').first()).toBeVisible();
  61  |     await expect(page.locator('text=Trusted by 10+ Nigerian Schools').first()).toBeVisible();
  62  |     
  63  |     await page.screenshot({ 
  64  |       path: getImgPath('03-trust-badges.png'), 
  65  |       fullPage: false 
  66  |     });
  67  |   });
  68  | 
  69  |   // =============================================
  70  |   // TEST 4: Hero Section
  71  |   // =============================================
  72  |   test('should display hero section with correct content', async ({ page }) => {
  73  |     await expect(page.locator('text=Academic Intelligence for Nigerian Schools')).toBeVisible();
  74  |     await expect(page.locator('text=AI grading, offline-first CBT exams, and academic writing tools')).toBeVisible();
  75  |     await expect(page.locator('button', { hasText: "Start Free Trial – We'll Call to Help" })).toBeVisible();
  76  |     await expect(page.locator('button', { hasText: 'View Demo' })).toBeVisible();
  77  |     await expect(page.locator('text=No credit card')).toBeVisible();
  78  |     await expect(page.locator('text=14-day free trial')).toBeVisible();
  79  |     await expect(page.locator('text=Cancel anytime')).toBeVisible();
  80  |     
  81  |     await page.screenshot({ 
  82  |       path: getImgPath('04-hero-section.png'), 
  83  |       fullPage: false 
  84  |     });
  85  |   });
  86  | 
  87  |   // =============================================
  88  |   // TEST 5: Hero Image
  89  |   // =============================================
  90  |   test('should display hero image with fallback', async ({ page }) => {
  91  |     const heroImage = page.locator('img[alt*="Nigerian students"]');
  92  |     await expect(heroImage).toBeVisible();
  93  |     await expect(page.locator('text=WAEC & NECO Aligned')).toBeVisible();
  94  |     await expect(page.locator('text=99.4% Accuracy')).toBeVisible();
  95  |     
  96  |     await page.screenshot({ 
  97  |       path: getImgPath('05-hero-image.png'), 
  98  |       fullPage: false 
  99  |     });
  100 |   });
  101 | 
  102 |   // =============================================
  103 |   // TEST 6: PrincipalTimeSavedCard
  104 |   // =============================================
  105 |   test('should display PrincipalTimeSavedCard', async ({ page }) => {
  106 |     await page.locator('text=Real Impact for School Principals').scrollIntoViewIfNeeded();
  107 |     await page.waitForTimeout(500);
  108 |     await expect(page.locator('text=Real Impact for School Principals')).toBeVisible();
> 109 |     await expect(page.locator('text=Saved by Nigerian School Principals')).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  110 |     
  111 |     await page.screenshot({ 
  112 |       path: getImgPath('06-principal-time-saved-card.png'), 
  113 |       fullPage: false 
  114 |     });
  115 |   });
  116 | 
  117 |   // =============================================
  118 |   // TEST 7: TeacherApprovalCard (Human-in-the-Loop)
  119 |   // =============================================
  120 |   test('should display TeacherApprovalCard', async ({ page }) => {
  121 |     await page.locator('text=Teacher Empowerment').scrollIntoViewIfNeeded();
  122 |     await page.waitForTimeout(500);
  123 |     await expect(page.locator('text=Teacher Empowerment')).toBeVisible();
  124 |     await expect(page.locator('text=AI Speed with Total Teacher Authority')).toBeVisible();
  125 |     await expect(page.locator('text=Senior Literature Teacher')).toBeVisible();
  126 |     await expect(page.locator('text=Federal Government College, Lagos')).toBeVisible();
  127 |     
  128 |     await page.screenshot({ 
  129 |       path: getImgPath('07-teacher-approval-card.png'), 
  130 |       fullPage: false 
  131 |     });
  132 |   });
  133 | 
  134 |   // =============================================
  135 |   // TEST 8: CBT Section (Offline First)
  136 |   // =============================================
  137 |   test('should display CBT section with offline badge', async ({ page }) => {
  138 |     await page.locator('text=Offline CBT Examinations').scrollIntoViewIfNeeded();
  139 |     await page.waitForTimeout(500);
  140 |     await expect(page.locator('text=Offline CBT Examinations')).toBeVisible();
  141 |     await expect(page.locator('text=Works Offline')).toBeVisible();
  142 |     await expect(page.locator('text=Students complete exams without active internet connection.')).toBeVisible();
  143 |     await expect(page.locator('text=Offline Mode Active')).toBeVisible();
  144 |     await expect(page.locator('img[alt*="CBT Lab"]')).toBeVisible();
  145 |     
  146 |     await page.screenshot({ 
  147 |       path: getImgPath('08-cbt-section.png'), 
  148 |       fullPage: false 
  149 |     });
  150 |   });
  151 | 
  152 |   // =============================================
  153 |   // TEST 9: Free Writing Tools Section
  154 |   // =============================================
  155 |   test('should display Free Writing Tools section with all 5 tools', async ({ page }) => {
  156 |     await page.locator('text=100% Free Academic Writing Tools').scrollIntoViewIfNeeded();
  157 |     await page.waitForTimeout(500);
  158 |     await expect(page.locator('text=100% Free Academic Writing Tools')).toBeVisible();
  159 |     await expect(page.locator('text=No Registration Required')).toBeVisible();
  160 |     
  161 |     const tools = ['Word Counter', 'Paraphraser', 'Readability', 'Citation Builder', 'Summarizer'];
  162 |     for (const toolName of tools) {
  163 |       await expect(page.locator(`text=${toolName}`).first()).toBeVisible();
  164 |     }
  165 |     
  166 |     await page.screenshot({ 
  167 |       path: getImgPath('09-writing-tools-section.png'), 
  168 |       fullPage: false 
  169 |     });
  170 |   });
  171 | 
  172 |   // =============================================
  173 |   // TEST 10: Dashboard Dropdown
  174 |   // =============================================
  175 |   test('should display Dashboard dropdown with all 6 role links', async ({ page }) => {
  176 |     const dropdownContainer = page.locator('nav div.relative.group');
  177 |     await dropdownContainer.hover();
  178 |     await page.waitForTimeout(300);
  179 |     
  180 |     const roles = ['Principal', 'Teacher', 'Student', 'Parent', 'Bursar', 'VP'];
  181 |     for (const role of roles) {
  182 |       await expect(page.locator('nav').locator(`text=${role}`)).toBeVisible();
  183 |     }
  184 |     
  185 |     await page.screenshot({ 
  186 |       path: getImgPath('10-dashboard-dropdown.png'), 
  187 |       fullPage: false 
  188 |     });
  189 |   });
  190 | 
  191 |   // =============================================
  192 |   // TEST 11: Navigation to Login Page
  193 |   // =============================================
  194 |   test('should navigate to Login page when Sign In is clicked', async ({ page }) => {
  195 |     await page.locator('button', { hasText: 'Sign In' }).click();
  196 |     await page.waitForLoadState('networkidle');
  197 |     await expect(page).toHaveURL('/login');
  198 |     await expect(page.locator('text=Welcome Back')).toBeVisible();
  199 |     
  200 |     await page.screenshot({ 
  201 |       path: getImgPath('11-login-page.png'), 
  202 |       fullPage: true 
  203 |     });
  204 |   });
  205 | 
  206 |   // =============================================
  207 |   // TEST 12: Navigation to Onboarding
  208 |   // =============================================
  209 |   test('should navigate to Onboarding when Get Started is clicked', async ({ page }) => {
```
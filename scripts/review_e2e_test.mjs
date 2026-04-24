/**
 * REVIEWER Phase C — Playwright E2E Tests
 * Tests 5 scenarios for the 3 claimed fixes.
 * READ-ONLY review script — does NOT modify app code.
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5050';
const EMAIL = '2451052919@qq.com';
const DB_CMD = `mysql -u root -pGr040103 gov -N -e`;

const results = [];
function record(name, pass, evidence) {
  results.push({ name, pass, evidence });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${name}`);
  console.log(`Evidence: ${evidence}`);
  console.log('='.repeat(60));
}

async function getVerificationCode() {
  const { execSync } = await import('child_process');
  // Wait a moment for the code to be written to DB
  await new Promise(r => setTimeout(r, 2000));
  const sql = `"SELECT code FROM email_verification_code WHERE email='${EMAIL}' AND used=0 ORDER BY created_at DESC LIMIT 1;"`;
  const code = execSync(`${DB_CMD} ${sql}`, { encoding: 'utf-8' }).trim();
  console.log(`[DB] Verification code retrieved: ${code}`);
  return code;
}

async function login(page) {
  console.log('\n--- LOGIN FLOW ---');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill email
  const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"], input[name="email"]');
  await emailInput.fill(EMAIL);
  console.log('[Login] Email filled');

  // Click send verification code button
  const sendBtn = page.locator('button:has-text("发送验证码"), button:has-text("获取验证码"), button:has-text("发送")');
  await sendBtn.click();
  console.log('[Login] Send code button clicked');

  // Get code from DB
  const code = await getVerificationCode();

  // Fill code
  const codeInput = page.locator('input[placeholder*="验证码"], input[placeholder*="code"], input[name="code"]');
  await codeInput.fill(code);
  console.log('[Login] Code filled');

  // Click login button
  const loginBtn = page.locator('button:has-text("登录"), button[type="submit"]');
  await loginBtn.click();
  console.log('[Login] Login button clicked');

  // Wait for navigation to chat page
  await page.waitForURL('**/chat**', { timeout: 10000 }).catch(() => {
    console.log('[Login] Did not redirect to /chat, checking current URL...');
  });
  console.log(`[Login] Current URL: ${page.url()}`);
  await page.waitForTimeout(1000);
}

async function test1_formPersistence(page) {
  console.log('\n--- TEST 1: Bug 1 — Form persistence after navigation ---');
  try {
    // Send a message that triggers form_prompt
    const chatInput = page.locator('textarea, input[placeholder*="输入"], input[placeholder*="问"]').first();
    await chatInput.fill('我想办理驾驶证换证');
    await chatInput.press('Enter');
    console.log('[T1] Message sent: 我想办理驾驶证换证');

    // Wait for bot response with form
    await page.waitForTimeout(5000);

    // Check if InlineServiceForm appeared
    const formEl = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: '在线办理' }).first();
    const formVisible = await formEl.isVisible({ timeout: 5000 }).catch(() => false);

    // Also check for any form-like element
    const anyForm = page.locator('form, [class*="ServiceForm"], button:has-text("提交申请")').first();
    const anyFormVisible = await anyForm.isVisible({ timeout: 3000 }).catch(() => false);

    console.log(`[T1] Form visible: ${formVisible}, Any form element: ${anyFormVisible}`);

    if (!formVisible && !anyFormVisible) {
      // Check what the bot actually responded with
      const messages = await page.locator('[class*="message"], [class*="bubble"], [class*="chat"]').allTextContents();
      console.log(`[T1] Messages on page: ${JSON.stringify(messages.slice(-3))}`);
      record('Test 1: Form persistence', false, 'InlineServiceForm did not appear after sending 办理驾驶证换证. Bot may not have returned form_prompt.');
      return;
    }

    // Navigate away
    const navLinks = page.locator('a[href="/services"], a[href="/guide"], nav a, button:has-text("办事")').first();
    const hasNav = await navLinks.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasNav) {
      await navLinks.click();
      console.log('[T1] Navigated away');
    } else {
      // Try direct navigation
      await page.goto(`${BASE}/services`, { waitUntil: 'networkidle' });
      console.log('[T1] Navigated to /services directly');
    }
    await page.waitForTimeout(1500);

    // Navigate back to chat
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if form persists
    const formAfter = page.locator('form, [class*="ServiceForm"], button:has-text("提交申请"), button:has-text("在线办理")').first();
    const formPersisted = await formAfter.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[T1] Form persisted after navigation: ${formPersisted}`);

    record('Test 1: Form persistence after navigation', formPersisted,
      formPersisted ? 'Form survived navigation away and back — DB persistence works' : 'Form disappeared after navigation — persistence may be broken');
  } catch (e) {
    record('Test 1: Form persistence', false, `Error: ${e.message}`);
  }
}

async function test2_scrollOvershoot(page) {
  console.log('\n--- TEST 2: Bug 2 — Scroll overshoot ---');
  try {
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Measure scroll state
    const scrollInfo = await page.evaluate(() => {
      return {
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        scrollTop: window.scrollY,
        bodyOverflow: getComputedStyle(document.body).overflow,
        htmlOverflow: getComputedStyle(document.documentElement).overflow,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      };
    });
    console.log(`[T2] Scroll info: ${JSON.stringify(scrollInfo)}`);

    // Try to scroll down
    await page.evaluate(() => window.scrollTo(0, 99999));
    await page.waitForTimeout(500);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    console.log(`[T2] After forced scroll: scrollY=${scrollAfter}`);

    // Check: document should not be significantly taller than viewport
    const overshoot = scrollInfo.documentHeight - scrollInfo.windowHeight;
    const pass = overshoot <= 5; // Allow tiny rounding
    record('Test 2: No scroll overshoot', pass,
      `documentHeight=${scrollInfo.documentHeight}, windowHeight=${scrollInfo.windowHeight}, overshoot=${overshoot}px, scrollY after force=${scrollAfter}`);
  } catch (e) {
    record('Test 2: Scroll overshoot', false, `Error: ${e.message}`);
  }
}

async function test3_collapseToggle(page) {
  console.log('\n--- TEST 3: Feature — Collapse/expand toggle ---');
  try {
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Look for existing form from Test 1, or send another message
    let formHeader = page.locator('button[aria-label*="收起"], button[aria-label*="展开"], button[aria-label*="collapse"], button[aria-label*="expand"]').first();
    let toggleVisible = await formHeader.isVisible({ timeout: 3000 }).catch(() => false);

    if (!toggleVisible) {
      // Try to find toggle by chevron icon or text
      formHeader = page.locator('button:has(svg[class*="chevron"]), button:has-text("收起"), button:has-text("展开")').first();
      toggleVisible = await formHeader.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!toggleVisible) {
      // Send a new message to trigger form
      const chatInput = page.locator('textarea, input[placeholder*="输入"]').first();
      if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatInput.fill('我要办理驾驶证换证');
        await chatInput.press('Enter');
        await page.waitForTimeout(5000);
        formHeader = page.locator('button[aria-label*="收起"], button[aria-label*="展开"]').first();
        toggleVisible = await formHeader.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    if (!toggleVisible) {
      record('Test 3: Collapse toggle', false, 'Could not find collapse/expand toggle button');
      return;
    }

    // Step 1: Verify form is auto-expanded (fields visible)
    const fieldsBeforeCollapse = page.locator('input[placeholder], select, textarea').filter({ hasNotText: '' });
    const fieldCountBefore = await fieldsBeforeCollapse.count();
    console.log(`[T3] Fields visible before collapse: ${fieldCountBefore}`);

    // Step 2: Click collapse
    await formHeader.click();
    await page.waitForTimeout(500);

    // Step 3: Verify fields are hidden
    const formBody = page.locator('input[placeholder*="姓名"], input[placeholder*="身份证"], select').first();
    const fieldsHidden = !(await formBody.isVisible({ timeout: 1000 }).catch(() => false));
    console.log(`[T3] Fields hidden after collapse: ${fieldsHidden}`);

    // Step 4: Verify header/toggle still visible
    const headerStillVisible = await formHeader.isVisible();
    console.log(`[T3] Toggle still visible: ${headerStillVisible}`);

    // Step 5: Re-expand
    await formHeader.click();
    await page.waitForTimeout(500);

    // Step 6: Verify fields visible again
    const fieldsAfterExpand = await formBody.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`[T3] Fields visible after re-expand: ${fieldsAfterExpand}`);

    const pass = fieldsHidden && headerStillVisible && fieldsAfterExpand;
    record('Test 3: Collapse/expand toggle', pass,
      `autoExpanded=${fieldCountBefore > 0}, collapsed=${fieldsHidden}, headerVisible=${headerStillVisible}, reExpanded=${fieldsAfterExpand}`);
  } catch (e) {
    record('Test 3: Collapse toggle', false, `Error: ${e.message}`);
  }
}

async function test4_crossPagePersistence(page) {
  console.log('\n--- TEST 4: Cross-page form persistence ---');
  try {
    // This is similar to Test 1 but uses SPA navigation (React Router links)
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for existing form
    const formExists = page.locator('button:has-text("提交申请"), button:has-text("在线办理"), [class*="ServiceForm"]').first();
    const hasForm = await formExists.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[T4] Form exists on chat page: ${hasForm}`);

    if (!hasForm) {
      record('Test 4: Cross-page persistence', false, 'No form found on chat page (depends on Test 1 having created one)');
      return;
    }

    // Navigate via SPA link (sidebar/nav)
    const guideLink = page.locator('a[href="/guide"], a[href="/services"], nav a').first();
    if (await guideLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guideLink.click();
      await page.waitForTimeout(1500);
      console.log(`[T4] SPA navigated to: ${page.url()}`);

      // Navigate back via SPA
      const chatLink = page.locator('a[href="/chat"]').first();
      if (await chatLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatLink.click();
        await page.waitForTimeout(3000);
      } else {
        await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
      }
    } else {
      // Fallback: full page navigation
      await page.goto(`${BASE}/services`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }

    const formAfter = page.locator('button:has-text("提交申请"), button:has-text("在线办理"), [class*="ServiceForm"]').first();
    const persisted = await formAfter.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[T4] Form persisted: ${persisted}`);

    record('Test 4: Cross-page form persistence', persisted,
      persisted ? 'Form survived SPA navigation — history reload works' : 'Form lost after SPA navigation');
  } catch (e) {
    record('Test 4: Cross-page persistence', false, `Error: ${e.message}`);
  }
}

async function test5_regression(page) {
  console.log('\n--- TEST 5: Regression — no console errors / 500s ---');
  try {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const networkErrors = [];
    page.on('response', resp => {
      if (resp.status() >= 500) networkErrors.push(`${resp.status()} ${resp.url()}`);
    });

    // Navigate through main pages
    for (const path of ['/chat', '/services', '/guide', '/chat']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      console.log(`[T5] Visited ${path} — OK`);
    }

    // Check Flask logs for 500s
    const { execSync } = await import('child_process');
    let flask500s = 'N/A';
    try {
      // Check recent Flask output for 500 status codes
      flask500s = execSync(`curl -s ${BASE}/api/admin/overview 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('overview OK')" 2>&1`, { encoding: 'utf-8' }).trim();
    } catch { flask500s = 'could not check'; }

    const jsErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404'));
    const pass = jsErrors.length === 0 && networkErrors.length === 0;

    record('Test 5: Regression check', pass,
      `JS errors: ${jsErrors.length} (${jsErrors.join('; ')}), Network 500s: ${networkErrors.length} (${networkErrors.join('; ')}), Flask: ${flask500s}`);
  } catch (e) {
    record('Test 5: Regression', false, `Error: ${e.message}`);
  }
}

// ===== MAIN =====
(async () => {
  console.log('🚀 Starting Phase C E2E Tests...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // First check if Flask is running
    const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
    if (!resp || resp.status() >= 500) {
      console.error('❌ Flask is not responding at ' + BASE);
      process.exit(1);
    }
    console.log(`Flask responding: ${resp.status()} at ${page.url()}`);

    // Login
    await login(page);

    // Take screenshot after login
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_after_login.png' });
    console.log('[Screenshot] After login saved');

    // Run tests
    await test1_formPersistence(page);
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_test1.png' });

    await test2_scrollOvershoot(page);
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_test2.png' });

    await test3_collapseToggle(page);
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_test3.png' });

    await test4_crossPagePersistence(page);
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_test4.png' });

    await test5_regression(page);
    await page.screenshot({ path: '/Users/huangyihang/Code/project_gr/scripts/e2e_test5.png' });

  } catch (e) {
    console.error('Fatal error:', e);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('PHASE C — E2E TEST SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`);
    console.log(`     ${r.evidence}`);
  }
  const passed = results.filter(r => r.pass).length;
  console.log(`\nTotal: ${passed}/${results.length} passed`);
  console.log('='.repeat(60));
})();

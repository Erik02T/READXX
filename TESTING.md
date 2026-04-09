# READXX Integration Testing Checklist

Manual smoke test flow to verify each integration point end-to-end.

## Pre-requisites
- Backend running on `http://localhost:8080`
- Redis and PostgreSQL connected via docker-compose
- Extension built to `dist/` directory

## Test Flow

### 1. Load Extension
- [ ] Open Chrome and navigate to `chrome://extensions`
- [ ] Enable "Developer mode" (toggle in top-right)
- [ ] Click "Load unpacked"
- [ ] Select the `dist/` directory
- [ ] Verify extension appears in extension list

### 2. Authentication
- [ ] Click extension icon in toolbar
- [ ] Navigate to signup/login panel
- [ ] Register new account: `test@test.com` / `password123`
  - [ ] POST `/auth/register` succeeds
  - [ ] No validation errors shown
- [ ] Login with same credentials
  - [ ] POST `/auth/login` succeeds
  - [ ] Access token received in response
  - [ ] Auth cookie set (check DevTools → Application → Cookies)

### 3. Extension UI
- [ ] Open any article in a new tab
- [ ] Click extension icon in toolbar
- [ ] Verify extension popup/sidepanel loads without errors
- [ ] Select some text on the page
- [ ] Verify **FloatingToolbar** appears with action buttons

### 4. Word Saving
- [ ] Select a word on the article
- [ ] Click **Save** button in FloatingToolbar
  - [ ] Word appears in SidePanel WordList
  - [ ] Word is saved to IndexedDB (check DevTools → Application → IndexedDB)
- [ ] Select and save 2-3 more words
  - [ ] All words appear in SidePanel

### 5. Study Mode
- [ ] Click SidePanel **Study** tab
- [ ] Verify saved words appear as spaced-repetition cards
- [ ] Card shows: word, definition, next review date
- [ ] Rate a card as "Good"
  - [ ] `nextReview` timestamp updates in IndexedDB
  - [ ] Card position in queue adjusts

### 6. Translation
- [ ] Select a word/phrase on the article
- [ ] Click **Translate** action in FloatingToolbar
  - [ ] LLM generates translation/definition
  - [ ] Response displays in sidebar/tooltip
  - [ ] No console errors

### 7. Server Sync
- [ ] Verify `/sync/push` endpoint is called
  - [ ] Check backend logs or network tab
  - [ ] Word data includes all required fields
- [ ] Verify word receives `serverId` in IndexedDB after sync
- [ ] Check words are persisted in `words` table in PostgreSQL

### 8. History Tracking
- [ ] Finish reading an article (visible on page)
- [ ] Navigate to SidePanel **History** tab
  - [ ] Article appears in history list
  - [ ] Shows article title, domain, read date
- [ ] Click article in history
  - [ ] Article URL loads or displays summary

### 9. Error Handling
- [ ] Simulate network error: disable WiFi
  - [ ] Extension shows error message
  - [ ] Words are saved to IndexedDB (offline persistence)
- [ ] Reconnect and sync
  - [ ] Queued words push to server successfully

### 10. Browser Consistency
- [ ] Close and reopen extension
  - [ ] Saved words persist in sidebar
  - [ ] Auth still active (token in storage)
- [ ] Reload extension in `chrome://extensions`
  - [ ] No errors on reload
  - [ ] Functionality restored

## Success Criteria
- ✅ All 10 sections pass their checks
- ✅ No console errors (DevTools → Console)
- ✅ All API calls return 2xx status codes
- ✅ Data persists across sessions
- ✅ Offline functionality works

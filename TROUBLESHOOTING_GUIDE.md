# Troubleshooting Guide - Tab Switching Issue

## 🎯 **Current Issue**
When switching tabs and returning to the app, the chat gets stuck in a loading state and messages don't work properly.

## 🔍 **Debugging Approach**

### **Comprehensive Logging Added**

I've added detailed logging to track the exact flow:

#### **Client-Side Logging (🟡 CLIENT:)**
- Message send initiation
- Tab visibility state
- API request preparation
- Stream reading process
- Database operations
- Error handling

#### **API-Side Logging (🔵 API:)**
- API endpoint calls
- Message processing
- OpenAI API calls
- Stream creation and chunk processing
- Response handling

### **How to Debug**

1. **Open Browser Console** (F12 → Console)
2. **Send a message** and watch the logs
3. **Switch tabs** and observe what happens
4. **Return to tab** and try sending again
5. **Look for patterns** in the logs

### **Expected Flow (Normal Operation)**
```
🟡 CLIENT: handleSendMessage called
🟡 CLIENT: Setting loading state
🟡 CLIENT: Saving user message to database
🟡 CLIENT: Making fetch request to /api/chat
🔵 API: POST /api/chat called
🔵 API: About to call OpenAI with messages
🔵 API: OpenAI completion created, starting stream
🔵 API: Stream started, beginning to read chunks
🟡 CLIENT: API response OK, getting reader
🟡 CLIENT: Reader obtained, starting to read stream
🔵 API: Chunk 1: "💙 ¡Me alegra escuchar eso!"
🟡 CLIENT: Received content chunk: 25 chars, total: 25
🔵 API: Chunk 2: " Antes de comenzar..."
🟡 CLIENT: Received content chunk: 20 chars, total: 45
...
🔵 API: Stream completed, sent 15 chunks
🟡 CLIENT: Received [DONE] signal
🟡 CLIENT: Stream completed
🟡 CLIENT: Saving assistant message to database
🟡 CLIENT: Message send process completed successfully
```

### **What to Look For**

#### **If API is not called:**
- Look for `🔵 API: POST /api/chat called` - if missing, the request never reaches the server
- Check for `🟡 CLIENT: Making fetch request to /api/chat` - if missing, the client isn't making the request

#### **If API is called but no response:**
- Look for `🔵 API: About to call OpenAI with messages` - if missing, there's an issue with message preparation
- Check for `🔵 API: OpenAI completion created, starting stream` - if missing, OpenAI API call failed

#### **If stream starts but gets stuck:**
- Look for `🟡 CLIENT: Reader obtained, starting to read stream` - if this appears but no chunks follow, the stream is stuck
- Check for `🔵 API: Chunk X: "..."` - if these stop appearing, the OpenAI stream is stuck

#### **If tab switching causes issues:**
- Look for `🟡 CLIENT: Tab visibility changed: false` - confirms tab switching is detected
- Check for `🟡 CLIENT: Tab hidden, waiting...` - shows the client is waiting for tab to become visible again

## 🧪 **Testing Steps**

### **Test 1: Normal Operation**
1. Send a message
2. Watch console logs
3. Verify complete flow from client to API to OpenAI and back

### **Test 2: Tab Switching**
1. Send a message
2. Switch tabs while it's loading
3. Return to tab
4. Try sending another message
5. Check if the flow is interrupted

### **Test 3: API Test Button**
1. Click "Test API" button
2. Verify it works (should show "Test successful!")
3. Compare with normal message flow

## 🔧 **Current Fixes Applied**

### **1. Tab Visibility Handling**
- ✅ Tracks tab visibility state
- ✅ Prevents sending when tab is hidden
- ✅ Visual indicator when paused

### **2. Stream Cleanup**
- ✅ Cancels streams when tab becomes hidden
- ✅ Proper cleanup of readers and controllers
- ✅ Component unmount cleanup

### **3. Enhanced Logging**
- ✅ Client-side flow tracking
- ✅ API-side flow tracking
- ✅ Detailed error reporting

## 📊 **Next Steps**

Based on the console logs, we can identify exactly where the flow breaks:

1. **If API calls are not made** → Client-side issue
2. **If API calls fail** → Server-side issue  
3. **If OpenAI calls fail** → API key or OpenAI issue
4. **If streams get stuck** → Stream handling issue
5. **If tab switching breaks flow** → Tab visibility handling issue

**Try sending a message now and share the console logs!** This will help us pinpoint exactly where the issue occurs.

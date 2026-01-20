# Meta Quest Device Testing Guide

## Overview

This guide provides comprehensive instructions for testing the RxDx 3D/VR visualization on Meta Quest devices (Quest 2, Quest 3, Quest Pro). The WebXR implementation is optimized for these devices with specific configurations for performance and usability.

**References:** Requirement 16 (Dual Frontend Interface)

## Supported Devices

| Device | Display | Refresh Rate | Hand Tracking | Controllers |
|--------|---------|--------------|---------------|-------------|
| Meta Quest 2 | 1832×1920 per eye | 72/90/120 Hz | v2.0 | Touch Controllers |
| Meta Quest 3 | 2064×2208 per eye | 72/90/120 Hz | v2.2 | Touch Plus Controllers |
| Meta Quest Pro | 1800×1920 per eye | 72/90 Hz | v2.1 | Touch Pro Controllers |

## Pre-Testing Setup

### 1. Device Configuration

#### Enable Developer Mode
1. Install Meta Quest mobile app on your phone
2. Go to **Settings > Developer Mode**
3. Enable **Developer Mode** toggle
4. Restart your Quest headset

#### Enable WebXR in Browser
1. Open Meta Quest Browser
2. Navigate to `chrome://flags` (or `about:flags`)
3. Search for "WebXR"
4. Enable the following flags:
   - `WebXR Device API` - Enabled
   - `WebXR Hand Input` - Enabled
   - `WebXR Layers` - Enabled
   - `WebXR Anchors` - Enabled (for AR features)

#### Performance Settings
1. Go to **Settings > System > Performance**
2. Set **Refresh Rate** to 90Hz (recommended) or 120Hz for Quest 3
3. Enable **Fixed Foveated Rendering** for better performance

### 2. Network Setup

#### Local Development Testing
```bash
# Start the frontend development server with HTTPS
# (Required for WebXR on Quest Browser)
npm run dev -- --host --https

# Or use the production build
npm run build
npm run preview -- --host --https
```

#### Access from Quest
1. Note your development machine's IP address
2. On Quest Browser, navigate to: `https://<your-ip>:5173`
3. Accept the self-signed certificate warning

### 3. ADB Debugging (Optional but Recommended)

```bash
# Install ADB
# macOS: brew install android-platform-tools
# Windows: Download from Android SDK

# Connect Quest via USB and enable USB debugging
adb devices

# View browser console logs
adb logcat -s chromium

# Take screenshots
adb exec-out screencap -p > screenshot.png

# Record video
adb shell screenrecord /sdcard/recording.mp4
```

## Testing Checklist

### Phase 1: Basic WebXR Support

- [ ] **VR Session Entry**
  - [ ] VR button displays correctly
  - [ ] Clicking "Enter VR" initiates immersive session
  - [ ] Session starts without errors
  - [ ] Reference space (local-floor) is established correctly

- [ ] **VR Session Exit**
  - [ ] "Exit VR" button is accessible
  - [ ] Session ends cleanly
  - [ ] Returns to 2D view without issues
  - [ ] No memory leaks after multiple enter/exit cycles

- [ ] **Graceful Degradation**
  - [ ] Non-XR browsers show appropriate fallback
  - [ ] Error messages are user-friendly
  - [ ] 2D graph view remains functional

### Phase 2: Visual Quality

- [ ] **3D Graph Rendering**
  - [ ] Nodes render at correct positions
  - [ ] Node colors match type (requirement, task, test, risk)
  - [ ] Node labels are readable at typical viewing distance
  - [ ] Edges render correctly between nodes
  - [ ] Edge arrows indicate direction

- [ ] **Lighting and Materials**
  - [ ] Ambient lighting provides adequate visibility
  - [ ] Point light creates depth perception
  - [ ] Materials respond to lighting correctly
  - [ ] No z-fighting or visual artifacts

- [ ] **Text Rendering**
  - [ ] Node labels are crisp and readable
  - [ ] Text faces the user (billboarding)
  - [ ] Font size is appropriate for VR viewing
  - [ ] No text clipping or overflow

### Phase 3: Performance

- [ ] **Frame Rate**
  - [ ] Maintains 72 FPS minimum (Quest 2/Pro)
  - [ ] Maintains 90 FPS target (Quest 3)
  - [ ] No dropped frames during normal interaction
  - [ ] Smooth transitions during camera movement

- [ ] **Memory Usage**
  - [ ] No memory leaks during extended sessions
  - [ ] Graph with 100+ nodes renders smoothly
  - [ ] Force simulation doesn't cause stuttering

- [ ] **Load Times**
  - [ ] Initial scene loads within 5 seconds
  - [ ] Graph data loads without blocking render
  - [ ] No visible pop-in of nodes

### Phase 4: Controller Interaction

- [ ] **Controller Detection**
  - [ ] Both controllers are detected
  - [ ] Controller models render (if enabled)
  - [ ] Ray pointers are visible

- [ ] **Trigger Input**
  - [ ] Trigger press is detected
  - [ ] Trigger release is detected
  - [ ] Analog trigger value is accurate

- [ ] **Grip Input**
  - [ ] Grip press is detected
  - [ ] Grip release is detected
  - [ ] Grip can initiate drag operations

- [ ] **Thumbstick Input**
  - [ ] Thumbstick movement is detected
  - [ ] Deadzone prevents drift
  - [ ] Thumbstick click is detected

- [ ] **Button Input**
  - [ ] A/X button press detected
  - [ ] B/Y button press detected
  - [ ] Menu button accessible

- [ ] **Haptic Feedback**
  - [ ] Haptics trigger on node hover
  - [ ] Haptics trigger on selection
  - [ ] Haptics trigger on drag start/end
  - [ ] Haptic intensity is appropriate

### Phase 5: Hand Tracking

- [ ] **Hand Detection**
  - [ ] Both hands are detected when visible
  - [ ] Hand tracking activates when controllers are set down
  - [ ] Smooth transition between controllers and hands

- [ ] **Joint Tracking**
  - [ ] All 25 joints per hand are tracked
  - [ ] Joint positions are accurate
  - [ ] No jitter in joint positions

- [ ] **Pinch Gesture**
  - [ ] Pinch is detected (thumb + index)
  - [ ] Pinch position is accurate
  - [ ] Pinch can select nodes
  - [ ] Pinch release is detected

- [ ] **Grab Gesture**
  - [ ] Grab is detected (all fingers curled)
  - [ ] Grab can initiate drag
  - [ ] Grab release ends drag

- [ ] **Point Gesture**
  - [ ] Point is detected (index extended)
  - [ ] Point direction is accurate
  - [ ] Point can be used for ray casting

### Phase 6: Node Interaction

- [ ] **Node Selection**
  - [ ] Nodes can be selected via controller trigger
  - [ ] Nodes can be selected via hand pinch
  - [ ] Selected node shows visual feedback
  - [ ] Selection persists until deselected

- [ ] **Node Hover**
  - [ ] Hover state shows visual feedback
  - [ ] Hover triggers haptic feedback
  - [ ] Hover state clears when ray moves away

- [ ] **Node Dragging**
  - [ ] Nodes can be dragged via controller grip
  - [ ] Nodes can be dragged via hand pinch-hold
  - [ ] Dragged node follows input smoothly
  - [ ] Drag end releases node at new position
  - [ ] Force simulation reacts to dragged nodes

### Phase 7: Navigation

- [ ] **Teleportation** (if implemented)
  - [ ] Teleport target is visible
  - [ ] Teleportation is smooth
  - [ ] No motion sickness from teleport

- [ ] **Smooth Locomotion** (if implemented)
  - [ ] Thumbstick movement works
  - [ ] Movement speed is comfortable
  - [ ] Rotation is smooth

- [ ] **Comfort Settings**
  - [ ] Vignette during movement (if enabled)
  - [ ] Snap turn option (if enabled)
  - [ ] Seated/standing mode works

### Phase 8: Edge Cases

- [ ] **Session Interruption**
  - [ ] Removing headset pauses session
  - [ ] Putting headset back resumes session
  - [ ] Guardian boundary interruption handled

- [ ] **Controller Disconnection**
  - [ ] Losing controller tracking handled gracefully
  - [ ] Reconnection restores functionality

- [ ] **Low Battery**
  - [ ] Low battery warnings don't crash session
  - [ ] Session continues with reduced functionality

- [ ] **Network Issues**
  - [ ] Temporary network loss handled
  - [ ] Reconnection restores data sync

## Performance Optimization Checklist

### Rendering Optimizations

- [x] **Foveated Rendering**
  - XR store configured with `foveation: 1` (maximum)
  - Reduces peripheral rendering quality for performance

- [x] **Frame Rate Target**
  - XR store configured with `frameRate: 'high'` (90Hz)
  - Falls back to 72Hz on older devices

- [ ] **Level of Detail (LOD)**
  - Implement LOD for distant nodes
  - Reduce geometry complexity at distance

- [ ] **Frustum Culling**
  - Nodes outside view frustum not rendered
  - Edges to culled nodes handled appropriately

- [ ] **Instanced Rendering**
  - Use instancing for identical node geometries
  - Reduces draw calls significantly

### Memory Optimizations

- [ ] **Texture Atlasing**
  - Combine node textures into atlas
  - Reduce texture switches

- [ ] **Geometry Sharing**
  - Share geometry between similar nodes
  - Use BufferGeometry for efficiency

- [ ] **Object Pooling**
  - Pool frequently created/destroyed objects
  - Reduce garbage collection pauses

## Known Issues and Workarounds

### Quest Browser Limitations

1. **WebGL Context Loss**
   - Issue: Context may be lost during long sessions
   - Workaround: Implement context restoration handler
   - Status: Handled in R3F Canvas

2. **Audio Autoplay**
   - Issue: Audio requires user gesture
   - Workaround: Start audio on first interaction
   - Status: N/A for current implementation

3. **HTTPS Requirement**
   - Issue: WebXR requires secure context
   - Workaround: Use HTTPS even in development
   - Status: Documented in setup instructions

### Device-Specific Issues

1. **Quest 2 - Hand Tracking Latency**
   - Issue: Slight latency in hand tracking v2.0
   - Workaround: Add prediction/smoothing
   - Status: Acceptable for current use case

2. **Quest Pro - Eye Tracking**
   - Issue: Eye tracking API not yet standardized
   - Workaround: Use foveated rendering without eye tracking
   - Status: Future enhancement

3. **Quest 3 - Mixed Reality**
   - Issue: Passthrough API differences
   - Workaround: Detect device and adjust
   - Status: AR mode uses standard WebXR AR

## Debugging Tips

### Console Logging
```javascript
// Enable verbose XR logging
localStorage.setItem('xr-debug', 'true');

// Check XR support
navigator.xr?.isSessionSupported('immersive-vr').then(console.log);

// Monitor frame rate
// Add to scene:
import { Stats } from '@react-three/drei';
<Stats />
```

### Performance Profiling
```javascript
// Enable Three.js performance monitoring
import { Perf } from 'r3f-perf';
<Perf position="top-left" />
```

### Remote Debugging
1. Connect Quest via USB
2. Enable USB debugging in Quest settings
3. Open `chrome://inspect` on desktop Chrome
4. Click "inspect" on Quest browser tab

## Test Report Template

```markdown
## Meta Quest VR Test Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Device:** Quest 2 / Quest 3 / Quest Pro
**Firmware Version:** [Version]
**Browser Version:** [Version]
**App Version:** [Version]

### Test Environment
- Network: [WiFi/USB]
- Development Server: [Local/Remote]
- Graph Size: [Number of nodes/edges]

### Test Results

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| VR Session | | | |
| Visual Quality | | | |
| Performance | | | |
| Controllers | | | |
| Hand Tracking | | | |
| Node Interaction | | | |
| Navigation | | | |
| Edge Cases | | | |

### Issues Found
1. [Issue description]
   - Severity: [Critical/Major/Minor]
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]

### Performance Metrics
- Average FPS: [Value]
- Min FPS: [Value]
- Memory Usage: [Value]
- Load Time: [Value]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

## Resources

- [Meta Quest Developer Documentation](https://developer.oculus.com/documentation/)
- [WebXR Device API Specification](https://www.w3.org/TR/webxr/)
- [React Three Fiber XR Documentation](https://docs.pmnd.rs/xr)
- [Three.js VR Documentation](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content)
- [Meta Quest Browser WebXR Support](https://developer.oculus.com/documentation/web/browser-webxr/)

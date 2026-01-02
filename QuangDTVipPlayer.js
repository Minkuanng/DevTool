// ==UserScript==
// @name         Auto Redeem Code Pro
// @namespace    http://tampermonkey.net/
// @version      1.5.1
// @description  Auto redeem code với tính năng xoá mã tự động sau 5s khi lỗi
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Biến toàn cục
    let mainUI = null;
    let isUIVisible = false;
    let isInitializing = false;
    let clearTimeoutId = null;
    let resetTimeoutId = null;
    
    // Tải CryptoJS
    const loadCryptoJS = () => {
        return new Promise((resolve) => {
            if (typeof CryptoJS !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
            script.onload = resolve;
            script.onerror = () => {
                console.error('Không thể tải CryptoJS');
                resolve();
            };
            document.head.appendChild(script);
        });
    };
    
    // Tạo nút ảnh bật/tắt
    const createToggleButton = () => {
        // Kiểm tra nếu đã có nút
        if (document.getElementById('redeem-toggle-btn')) return;
        
        const toggleBtn = document.createElement('img');
        toggleBtn.id = 'redeem-toggle-btn';
        toggleBtn.src = 'https://raw.githubusercontent.com/Minkuanng/Image/refs/heads/main/QuangDevTool.png';
        toggleBtn.alt = 'Toggle Redeem';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 999999;
            width: 50px;
            height: 50px;
            cursor: pointer;
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s;
            border: 2px solid rgba(255,255,255,0.2);
        `;
        
        // Hiệu ứng hover
        toggleBtn.onmouseenter = () => {
            toggleBtn.style.transform = 'scale(1.1) rotate(5deg)';
            toggleBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            toggleBtn.style.borderColor = '#00ffff';
        };
        
        toggleBtn.onmouseleave = () => {
            toggleBtn.style.transform = 'scale(1) rotate(0deg)';
            toggleBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            toggleBtn.style.borderColor = 'rgba(255,255,255,0.2)';
        };
        
        // Click để bật/tắt main
        toggleBtn.onclick = () => {
            if (isInitializing) return;
            
            if (isUIVisible) {
                hideMainUI();
            } else {
                showMainUI();
            }
        };
        
        document.body.appendChild(toggleBtn);
        console.log('✅ Nút toggle đã được tạo!');
    };
    
    // Hiển thị main UI
    const showMainUI = async () => {
        if (isUIVisible || isInitializing) return;
        
        isInitializing = true;
        console.log('🔄 Đang hiển thị Main UI...');
        
        await loadCryptoJS();
        
        // Nếu đã có UI, chỉ cần hiển thị
        if (mainUI && document.body.contains(mainUI)) {
            console.log('📱 Main UI đã tồn tại, chỉ hiển thị lại');
            mainUI.style.display = 'block';
            mainUI.style.animation = 'slideDown 0.3s ease-out';
            isUIVisible = true;
            isInitializing = false;
            return;
        }
        
        // Tạo mới UI
        mainUI = document.createElement("div");
        mainUI.id = 'redeem-main-ui';
        mainUI.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999998;
            width: 240px;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.9);
            border: 1px solid transparent;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: white;
            display: block;
        `;

        // Thêm CSS animations
        const style = document.createElement("style");
        style.id = 'redeem-styles';
        if (!document.getElementById('redeem-styles')) {
            style.textContent = `
                @keyframes rainbowBorder {
                    0% { border-color: #ff0000; }
                    16.6% { border-color: #ff9900; }
                    33.3% { border-color: #ffff00; }
                    50% { border-color: #33ff00; }
                    66.6% { border-color: #0099ff; }
                    83.3% { border-color: #6633ff; }
                    100% { border-color: #ff0000; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -60%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
                @keyframes slideUp {
                    from { opacity: 1; transform: translate(-50%, -50%); }
                    to { opacity: 0; transform: translate(-50%, -60%); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-3px); }
                    75% { transform: translateX(3px); }
                }
                @keyframes statusSlide {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes inputClear {
                    0% { background: rgba(255, 50, 50, 0.3); }
                    50% { background: rgba(255, 50, 50, 0.5); }
                    100% { background: rgba(0, 0, 0, 0.4); }
                }
                @keyframes pulseWarning {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .rainbow-border {
                    animation: rainbowBorder 2s linear infinite;
                }
                .warning-pulse {
                    animation: pulseWarning 1s infinite;
                }
            `;
            document.head.appendChild(style);
        }
        mainUI.classList.add('rainbow-border');
        
        // Thêm animation fade in
        setTimeout(() => {
            mainUI.style.animation = "slideDown 0.3s ease-out";
        }, 10);

        // Header
        const header = document.createElement("div");
        header.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.15);
        `;

        // Tiêu đề
        const title = document.createElement("div");
        title.textContent = "🔑 AUTO REDEEM";
        title.style.cssText = `
            font-weight: bold;
            font-size: 15px;
            color: #fff;
            text-shadow: 0 0 8px rgba(255,255,255,0.4);
            text-align: center;
        `;

        header.appendChild(title);

        // Ô nhập mã
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Nhập mã code...";
        input.style.cssText = `
            width: 100%;
            padding: 11px 14px;
            margin-bottom: 14px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.4);
            color: white;
            font-size: 13px;
            outline: none;
            box-sizing: border-box;
            transition: all 0.3s;
            text-align: center;
        `;
        input.onfocus = () => {
            input.style.borderColor = "#00ffff";
            input.style.boxShadow = "0 0 12px rgba(0,255,255,0.4)";
            input.style.background = "rgba(0, 0, 0, 0.6)";
        };
        input.onblur = () => {
            input.style.borderColor = "rgba(255,255,255,0.2)";
            input.style.boxShadow = "none";
            input.style.background = "rgba(0, 0, 0, 0.4)";
        };

        // Nút start/stop
        const actionBtn = document.createElement("button");
        actionBtn.textContent = "▶️ START";
        actionBtn.style.cssText = `
            width: 100%;
            padding: 11px;
            background: linear-gradient(135deg, #00b09b, #96c93d);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 12px;
        `;
        actionBtn.onmouseenter = () => {
            if (!actionBtn.disabled) {
                actionBtn.style.transform = "scale(1.03)";
                actionBtn.style.boxShadow = "0 5px 15px rgba(0,176,155,0.4)";
            }
        };
        actionBtn.onmouseleave = () => {
            actionBtn.style.transform = "scale(1)";
            actionBtn.style.boxShadow = "none";
        };

        // Vùng hiển thị Start Tus
        const startTusDisplay = document.createElement("div");
        startTusDisplay.textContent = "• Ready";
        startTusDisplay.style.cssText = `
            color: #39FF14;
            font-size: 12px;
            text-align: center;
            padding: 7px 0;
            min-height: 22px;
            transition: all 0.2s;
            word-break: break-word;
            line-height: 1.4;
            opacity: 0.9;
        `;

        // Ghép các phần tử
        mainUI.appendChild(header);
        mainUI.appendChild(input);
        mainUI.appendChild(actionBtn);
        mainUI.appendChild(startTusDisplay);
        
        document.body.appendChild(mainUI);
        isUIVisible = true;
        isInitializing = false;

        // Setup logic chức năng
        setupRedeemLogic(mainUI, title, input, actionBtn, startTusDisplay);
        
        // Focus vào input
        setTimeout(() => {
            input.focus();
        }, 100);
        
        console.log('✅ Main UI đã hiển thị!');
    };
    
    // Ẩn main UI
    const hideMainUI = () => {
        if (!mainUI || !isUIVisible) return;
        
        console.log('🔄 Đang ẩn Main UI...');
        isUIVisible = false;
        
        // Hủy tất cả timeout
        clearAllTimeouts();
        
        mainUI.style.animation = "slideUp 0.3s ease-out";
        setTimeout(() => {
            if (mainUI && document.body.contains(mainUI)) {
                mainUI.style.display = 'none';
            }
        }, 250);
    };
    
    // Hủy tất cả timeout
    const clearAllTimeouts = () => {
        if (clearTimeoutId) {
            clearTimeout(clearTimeoutId);
            clearTimeoutId = null;
        }
        if (resetTimeoutId) {
            clearTimeout(resetTimeoutId);
            resetTimeoutId = null;
        }
    };
    
    // Hàm xoá mã sau delay
    const scheduleClearInput = (input, delay = 5000) => {
        // Hủy timeout cũ nếu có
        clearAllTimeouts();
        
        // Tạo timeout mới
        clearTimeoutId = setTimeout(() => {
            if (input && input.value) {
                console.log(`⏰ Xoá mã sau ${delay/1000}s: ${input.value.substring(0, 4)}...`);
                
                // Hiệu ứng xoá
                input.style.animation = "inputClear 1s ease-out";
                input.value = "";
                
                setTimeout(() => {
                    input.style.animation = "";
                    input.focus();
                }, 1000);
            }
            
            clearTimeoutId = null;
        }, delay);
    };
    
    // Hàm reset toàn bộ sau delay
    const scheduleResetAll = (input, actionBtn, startTusDisplay, title, mainUI, delay = 5000) => {
        // Hủy timeout cũ nếu có
        clearAllTimeouts();
        
        // Tạo timeout mới
        resetTimeoutId = setTimeout(() => {
            console.log(`🔄 Reset toàn bộ sau ${delay/1000}s`);
            
            // Xoá mã trong input
            if (input && input.value) {
                input.value = "";
                input.style.animation = "inputClear 1s ease-out";
                setTimeout(() => {
                    input.style.animation = "";
                    input.focus();
                }, 1000);
            }
            
            // Reset nút và status
            if (actionBtn && startTusDisplay && title) {
                actionBtn.textContent = "▶️ START";
                actionBtn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";
                actionBtn.disabled = false;
                
                startTusDisplay.textContent = "• Ready";
                startTusDisplay.style.color = "#39FF14";
                startTusDisplay.classList.remove('warning-pulse');
                
                title.textContent = "🔑 AUTO REDEEM";
                
                // Reset màu border
                mainUI.style.borderColor = "transparent";
                mainUI.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.9)";
                mainUI.classList.add('rainbow-border');
            }
            
            resetTimeoutId = null;
            
        }, delay);
    };
    
    // Setup logic redeem
    const setupRedeemLogic = (mainUI, title, input, actionBtn, startTusDisplay) => {
        // Biến kiểm soát
        let isRunning = false;
        let intervalId = null;
        const SPAM_INTERVAL = 1250;
        const RESET_DELAY = 5000; // 5 giây
        
        // Hàm dịch
        const translate = async (text) => {
            if (!/[\u4e00-\u9fa5]/.test(text)) return text;
            try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`);
                const data = await res.json(); 
                return data[0][0][0];
            } catch { 
                return text; 
            }
        };
        
        // Hàm kiểm tra định dạng mã
        const isValidCodeFormat = (code) => {
            // Loại bỏ khoảng trắng
            const cleanCode = code.replace(/\s+/g, '');
            
            // Kiểm tra độ dài
            if (cleanCode.length < 6 || cleanCode.length > 20) {
                return false;
            }
            
            // Kiểm tra chỉ chứa chữ cái, số và một số ký tự đặc biệt
            const validPattern = /^[A-Za-z0-9_-]+$/;
            if (!validPattern.test(cleanCode)) {
                return false;
            }
            
            return true;
        };
        
        // Hàm dừng spam và reset
        const stopSpamAndReset = (immediateClear = false) => {
            console.log('🛑 Dừng spam và reset...');
            
            // Dừng interval nếu đang chạy
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            
            // Reset trạng thái
            isRunning = false;
            
            // Reset nút
            if (actionBtn) {
                actionBtn.textContent = "▶️ START";
                actionBtn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";
                actionBtn.disabled = false;
            }
            
            // Nếu cần xoá ngay lập tức
            if (immediateClear && input && input.value) {
                input.value = "";
                input.style.animation = "inputClear 0.5s ease-out";
                setTimeout(() => {
                    input.style.animation = "";
                    input.focus();
                }, 500);
            }
            
            // Hủy tất cả timeout cũ
            clearAllTimeouts();
        };
        
        // Hàm tạo query và signature
        const toQueryString = (obj) => {
            return Object.keys(obj).sort().map(k => `${k}=${encodeURIComponent(obj[k])}`).join("&");
        };
        
        const generateSignature = (params) => {
            if (typeof CryptoJS === 'undefined') {
                console.error('CryptoJS chưa tải xong!');
                return 'nocrypto';
            }
            try {
                return CryptoJS.MD5(toQueryString(params) + "Ka*xQ@W7%SrPnYR3P%5*udF=yrpewQQN").toString().slice(4, 20);
            } catch (e) {
                console.error('Lỗi tạo signature:', e);
                return 'error';
            }
        };
        
        // Hàm thay đổi màu viền main
        const changeMainColor = (colorType) => {
            switch(colorType) {
                case 'red':
                    mainUI.style.borderColor = "rgba(255, 60, 60, 0.8)";
                    mainUI.style.boxShadow = "0 12px 40px rgba(255, 60, 60, 0.3)";
                    break;
                case 'green':
                    mainUI.style.borderColor = "rgba(60, 255, 60, 0.8)";
                    mainUI.style.boxShadow = "0 12px 40px rgba(60, 255, 60, 0.3)";
                    break;
                case 'yellow':
                    mainUI.style.borderColor = "rgba(255, 255, 60, 0.8)";
                    mainUI.style.boxShadow = "0 12px 40px rgba(255, 255, 60, 0.3)";
                    break;
                case 'blue':
                    mainUI.style.borderColor = "rgba(60, 160, 255, 0.8)";
                    mainUI.style.boxShadow = "0 12px 40px rgba(60, 160, 255, 0.3)";
                    break;
                case 'purple':
                    mainUI.style.borderColor = "rgba(160, 60, 255, 0.8)";
                    mainUI.style.boxShadow = "0 12px 40px rgba(160, 60, 255, 0.3)";
                    break;
                default:
                    mainUI.style.borderColor = "transparent";
                    mainUI.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.9)";
                    mainUI.classList.add('rainbow-border');
            }
        };
        
        // Hàm cập nhật Start Tus
        const updateStartTus = (message, color = "#39FF14", mainColor = null, isWarning = false) => {
            startTusDisplay.textContent = message;
            startTusDisplay.style.color = color;
            
            if (isWarning) {
                startTusDisplay.classList.add('warning-pulse');
            } else {
                startTusDisplay.classList.remove('warning-pulse');
            }
            
            if (mainColor) {
                changeMainColor(mainColor);
            }
            
            startTusDisplay.style.animation = "statusSlide 0.2s ease-out";
            setTimeout(() => {
                startTusDisplay.style.animation = "";
            }, 200);
        };
        
        // Hàm chuyển đổi nút
        const toggleButton = (running) => {
            if (running) {
                actionBtn.textContent = "⏹️ STOP";
                actionBtn.style.background = "linear-gradient(135deg, #ff416c, #ff4b2b)";
                changeMainColor('green');
                title.textContent = "🔑 RUNNING";
                updateStartTus("▶ Đang chạy...", "#00FF00", "green");
            } else {
                actionBtn.textContent = "▶️ START";
                actionBtn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";
                changeMainColor(null);
                title.textContent = "🔑 AUTO REDEEM";
                updateStartTus("• Ready", "#39FF14", null);
            }
        };
        
        // Hàm gửi request
        const sendRequest = async () => {
            try {
                const token = localStorage.getItem("token");
                const userId = localStorage.getItem("userId") || localStorage.getItem("uid");
                const cuid = localStorage.getItem("__DC_STAT_UUID") || "176633339559965073US";
                
                if (!token || !userId) {
                    updateStartTus("⚠️ Chưa đăng nhập", "#FF4444", "red", true);
                    stopSpamAndReset(true);
                    scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
                    return false;
                }
                
                const code = input.value.replace(/\s+/g, '');
                
                // KIỂM TRA: NẾU Ô INPUT TRỐNG
                if (!code || code.trim() === "") {
                    updateStartTus("⚠️ Xin vui lòng nhập code", "#FF4444", "red", true);
                    input.style.animation = "shake 0.3s";
                    setTimeout(() => {
                        input.style.animation = "";
                        input.focus();
                    }, 300);
                    stopSpamAndReset(true);
                    return false;
                }
                
                // Kiểm tra định dạng mã
                if (!isValidCodeFormat(code)) {
                    updateStartTus("❌ Mã không đúng định dạng", "#FF4444", "red", true);
                    stopSpamAndReset(true);
                    scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
                    return false;
                }
                
                updateStartTus("⏳ Đang xử lý...", "#FFAA00", "yellow");
                
                const params = {
                    cuid,
                    redeemCodes: code,
                    redeemType: "S01",
                    ts: Date.now(),
                    userId: userId
                };
                
                console.log('📤 Gửi request với mã:', code.substring(0, 4) + '...');
                
                const response = await fetch("https://api.vipplayer.net/cpCgw/mkt/redeem_code/exchange", {
                    method: "POST",
                    headers: { 
                        "content-type": "application/x-www-form-urlencoded", 
                        "authorization": `Bearer ${token}`, 
                        "x-signature": generateSignature(params) 
                    },
                    body: toQueryString(params)
                });
                
                console.log('📥 Response status:', response.status);
                
                const data = await response.json();
                console.log('📥 Response data:', data);
                
                if (data.data?.successList?.length > 0) {
                    updateStartTus("✅ Thành công!", "#00FF00", "green");
                    setTimeout(() => window.location.reload(), 800);
                    return true;
                }
                
                const message = data.data?.failList?.[0]?.failReason || data.msg || "Lỗi không xác định";
                const translated = await translate(message);
                
                // Xác định loại lỗi
                let shouldStopSpam = false;
                let shouldReset = true;
                let mainColor = "red";
                let icon = "❌";
                
                if (message.includes("đã nhận") || message.includes("đã sử dụng")) {
                    // Mã đã sử dụng: DỪNG SPAM, reset sau 5s
                    shouldStopSpam = true;
                    shouldReset = true;
                    mainColor = "yellow";
                    icon = "⚠️";
                    updateStartTus(`${icon} ${translated}`, "#FFAA00", mainColor, true);
                } 
                else if (message.includes("không tồn tại") || 
                        message.includes("không hợp lệ") || 
                        message.includes("không đúng") ||
                        message.includes("sai")) {
                    // Mã sai: DỪNG SPAM, reset sau 5s
                    shouldStopSpam = true;
                    shouldReset = true;
                    mainColor = "purple";
                    icon = "❓";
                    updateStartTus(`${icon} ${translated}`, "#FF4444", mainColor, true);
                } 
                else if (message.includes("hết hạn")) {
                    // Mã hết hạn: DỪNG SPAM, reset sau 5s
                    shouldStopSpam = true;
                    shouldReset = true;
                    mainColor = "blue";
                    icon = "⌛";
                    updateStartTus(`${icon} ${translated}`, "#FFAA00", mainColor, true);
                } 
                else if (message.includes("chưa mở") || message.includes("chưa đến")) {
                    // Chưa đến thời gian: DỪNG SPAM, reset sau 5s
                    shouldStopSpam = true;
                    shouldReset = true;
                    mainColor = "yellow";
                    icon = "⏰";
                    updateStartTus(`${icon} ${translated}`, "#FFAA00", mainColor, true);
                }
                else {
                    // Lỗi khác: DỪNG SPAM, reset sau 5s
                    shouldStopSpam = true;
                    shouldReset = true;
                    updateStartTus(`${icon} ${translated}`, "#FF4444", mainColor, true);
                }
                
                // Dừng spam nếu cần
                if (shouldStopSpam) {
                    stopSpamAndReset();
                }
                
                // Lập lịch reset nếu cần
                if (shouldReset) {
                    scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
                }
                
            } catch (error) {
                console.error('❌ Lỗi gửi request:', error);
                updateStartTus("⚠️ Lỗi kết nối", "#FFAA00", "yellow", true);
                
                // Dừng spam và reset sau 5s
                stopSpamAndReset();
                scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
            }
            return false;
        };
        
        // Hàm bắt đầu/dừng
        actionBtn.onclick = async () => {
            if (!isRunning) {
                const token = localStorage.getItem("token");
                const userId = localStorage.getItem("userId") || localStorage.getItem("uid");
                
                if (!token || !userId) {
                    updateStartTus("⚠️ Chưa đăng nhập", "#FF4444", "red", true);
                    scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
                    return;
                }
                
                const code = input.value.replace(/\s+/g, '');
                
                // KIỂM TRA: NẾU Ô INPUT TRỐNG
                if (!code || code.trim() === "") {
                    updateStartTus("⚠️ Xin vui lòng nhập code", "#FF4444", "red", true);
                    input.style.animation = "shake 0.3s";
                    setTimeout(() => {
                        input.style.animation = "";
                        input.focus();
                    }, 300);
                    return; // Dừng lại ngay, không reset sau 5s
                }
                
                // Kiểm tra định dạng mã
                if (!isValidCodeFormat(code)) {
                    updateStartTus("❌ Mã không đúng định dạng", "#FF4444", "red", true);
                    scheduleResetAll(input, actionBtn, startTusDisplay, title, mainUI, RESET_DELAY);
                    return;
                }
                
                isRunning = true;
                toggleButton(true);
                
                const success = await sendRequest();
                if (success) return;
                
                // Bắt đầu spam nếu không có lỗi nghiêm trọng
                if (isRunning) {
                    intervalId = setInterval(async () => {
                        if (!isRunning) return;
                        const success = await sendRequest();
                        if (success) {
                            clearInterval(intervalId);
                            isRunning = false;
                            toggleButton(false);
                        }
                    }, SPAM_INTERVAL);
                }
                
            } else {
                // Người dùng bấm dừng
                stopSpamAndReset(true);
            }
        };
        
        // Phím tắt
        const handleKeydown = (e) => {
            if (!isUIVisible) return;
            if (e.target === input && e.key === 'Enter') actionBtn.click();
            if (e.key === 'Escape') hideMainUI();
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        // Khởi tạo
        updateStartTus("• Ready", "#39FF14", null);
    };
    
    // Khởi tạo
    const init = () => {
        console.log('🚀 Auto Redeem Tool đang khởi động...');
        createToggleButton();
        console.log('👉 Click vào ảnh góc trên phải để mở/đóng tool');
    };
    
    // Chờ trang load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
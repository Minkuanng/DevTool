// ==UserScript==
// @name         Auto Check Code Pro Mobile
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  Auto check code cho điện thoại + Bot tìm tên + Full lịch sử
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
    let historyList = [];
    let currentCode = '';
    let isAutoCheckRunning = false;
    let autoCheckIntervalId = null;
    const HISTORY_KEY = 'check_code_history';
    const AUTO_CHECK_INTERVAL = 2000; // 2 giây giữa các lần check

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

    // Tải lịch sử
    const loadHistory = () => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                historyList = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Lỗi tải lịch sử:', e);
            historyList = [];
        }
        return historyList;
    };

    // Lưu lịch sử
    const saveHistory = () => {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
        } catch (e) {
            console.error('Lỗi lưu lịch sử:', e);
        }
    };

    // Thêm vào lịch sử (LUÔN thêm, không kiểm tra trùng)
    const addToHistory = (code, status, message, timestamp = Date.now()) => {
        const entry = {
            id: Date.now(),
            code,
            status,
            message,
            timestamp,
            time: new Date(timestamp).toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            })
        };
        
        historyList.unshift(entry);
        saveHistory();
        updateHistoryDisplay();
        
        console.log(`📝 Đã thêm vào lịch sử: ${code} - ${status}`);
    };

    // Xoá mục lịch sử theo ID
    const removeHistoryItem = (id) => {
        const initialLength = historyList.length;
        historyList = historyList.filter(item => item.id !== id);
        
        if (historyList.length < initialLength) {
            saveHistory();
            updateHistoryDisplay();
            console.log(`🗑️ Đã xoá mục lịch sử ID: ${id}`);
        }
    };

    // Tìm và xoá mã theo tên
    const findAndDeleteByName = (searchName) => {
        if (!searchName || searchName.trim() === '') {
            // Nếu input rỗng, hiển thị lại tất cả
            updateHistoryDisplay();
            return;
        }
        
        const searchTerm = searchName.toLowerCase().trim();
        const historyContent = document.getElementById('check-history-content');
        if (!historyContent) return;
        
        let foundCount = 0;
        let shouldDelete = false;
        
        // Kiểm tra xem có mã nào chứa tên này không
        historyList.forEach(item => {
            const itemName = item.message?.toLowerCase() || '';
            if (itemName.includes(searchTerm)) {
                foundCount++;
            }
        });
        
        if (foundCount > 0) {
            // Hỏi người dùng có muốn xoá không
            shouldDelete = confirm(`Tìm thấy ${foundCount} mã có tên chứa "${searchName}". Bạn có muốn xoá tất cả?`);
            
            if (shouldDelete) {
                // Xoá tất cả mã chứa tên này
                const initialLength = historyList.length;
                historyList = historyList.filter(item => {
                    const itemName = item.message?.toLowerCase() || '';
                    return !itemName.includes(searchTerm);
                });
                
                const removedCount = initialLength - historyList.length;
                if (removedCount > 0) {
                    saveHistory();
                    updateHistoryDisplay();
                    alert(`✅ Đã xoá ${removedCount} mã có tên chứa "${searchName}"`);
                }
            } else {
                // Chỉ highlight mà không xoá
                highlightSearchResults(searchTerm);
            }
        } else {
            // Không tìm thấy, chỉ highlight tìm kiếm
            highlightSearchResults(searchTerm);
        }
    };

    // Highlight kết quả tìm kiếm
    const highlightSearchResults = (searchTerm) => {
        const historyContent = document.getElementById('check-history-content');
        if (!historyContent) return;
        
        const allItems = historyContent.querySelectorAll('.history-item');
        let foundCount = 0;
        
        allItems.forEach(item => {
            const message = item.querySelector('.history-message')?.textContent?.toLowerCase() || '';
            const code = item.querySelector('.history-code')?.textContent?.toLowerCase() || '';
            
            if (message.includes(searchTerm) || code.includes(searchTerm)) {
                item.style.background = 'rgba(255, 255, 100, 0.15)';
                item.style.borderLeft = '3px solid #FFFF00';
                foundCount++;
            } else {
                item.style.background = 'rgba(255,255,255,0.05)';
                item.style.borderLeft = '3px solid ' + getStatusColor(item.dataset.status || 'info');
            }
        });
        
        // Hiển thị kết quả tìm kiếm
        const searchResult = document.getElementById('search-result');
        if (searchResult) {
            if (searchTerm) {
                searchResult.textContent = `🔍 Tìm thấy ${foundCount} kết quả cho "${searchTerm}"`;
                searchResult.style.display = 'block';
                
                // Auto ẩn sau 3 giây
                setTimeout(() => {
                    searchResult.style.display = 'none';
                }, 3000);
            } else {
                searchResult.style.display = 'none';
            }
        }
    };

    // Cập nhật hiển thị lịch sử
    const updateHistoryDisplay = () => {
        if (!mainUI) return;
        
        const historyContent = document.getElementById('check-history-content');
        if (!historyContent) return;
        
        historyContent.innerHTML = '';
        
        // Ẩn kết quả tìm kiếm nếu có
        const searchResult = document.getElementById('search-result');
        if (searchResult) {
            searchResult.style.display = 'none';
        }
        
        if (historyList.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.textContent = "Chưa có lịch sử check";
            emptyMsg.style.cssText = `
                text-align: center;
                color: rgba(255,255,255,0.5);
                font-size: 12px;
                padding: 15px;
                font-style: italic;
            `;
            historyContent.appendChild(emptyMsg);
            return;
        }
        
        // Hiển thị tất cả lịch sử
        historyList.forEach(entry => {
            const item = document.createElement("div");
            item.className = 'history-item';
            item.dataset.id = entry.id;
            item.dataset.status = entry.status;
            item.style.cssText = `
                padding: 6px;
                margin-bottom: 5px;
                background: rgba(255,255,255,0.05);
                border-radius: 5px;
                border-left: 3px solid ${getStatusColor(entry.status)};
                font-size: 10px;
                line-height: 1.3;
                transition: all 0.3s;
                position: relative;
            `;
            
            // Thêm nút xoá cho từng mục
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "×";
            deleteBtn.title = "Xoá mục này";
            deleteBtn.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                width: 16px;
                height: 16px;
                background: rgba(255, 50, 50, 0.3);
                color: #ff8888;
                border: none;
                border-radius: 50%;
                font-size: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: all 0.2s;
            `;
            
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.opacity = '1';
                deleteBtn.style.background = 'rgba(255, 50, 50, 0.5)';
                deleteBtn.style.transform = 'scale(1.1)';
            });
            
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.opacity = '0.7';
                deleteBtn.style.background = 'rgba(255, 50, 50, 0.3)';
                deleteBtn.style.transform = 'scale(1)';
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Xoá mã "${entry.code}" khỏi lịch sử?`)) {
                    removeHistoryItem(entry.id);
                }
            });
            
            const codeLine = document.createElement("div");
            codeLine.className = 'history-code';
            codeLine.textContent = `🎟️ ${entry.code}`;
            codeLine.style.cssText = `
                font-weight: bold;
                color: #fff;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 10px;
                padding-right: 18px;
            `;
            
            const statusLine = document.createElement("div");
            statusLine.className = 'history-message';
            statusLine.textContent = `${getStatusIcon(entry.status)} ${entry.message}`;
            statusLine.style.cssText = `
                color: ${getStatusColor(entry.status)};
                font-size: 9px;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                line-height: 1.2;
            `;
            
            const timeLine = document.createElement("div");
            timeLine.textContent = `🕒 ${entry.time}`;
            timeLine.style.cssText = `
                color: rgba(255,255,255,0.4);
                font-size: 8px;
                text-align: right;
            `;
            
            item.appendChild(deleteBtn);
            item.appendChild(codeLine);
            item.appendChild(statusLine);
            item.appendChild(timeLine);
            historyContent.appendChild(item);
        });
    };

    // Helper functions
    const getStatusColor = (status) => {
        switch(status) {
            case 'success': return '#00FF00';
            case 'error': return '#FF4444';
            case 'warning': return '#FFAA00';
            case 'info': return '#4488FF';
            default: return '#AAAAAA';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '🔸';
        }
    };

    // Tạo mã code với prefix txy
    const generateRandomtxyCode = () => {
        const prefix = "txy";
        const letterCount = Math.floor(Math.random() * 3) + 2;
        const numberCount = 12 - letterCount;
        
        let letters = '';
        const allowedLetters = 'abcdef';
        for (let i = 0; i < letterCount; i++) {
            letters += allowedLetters.charAt(Math.floor(Math.random() * allowedLetters.length));
        }
        
        let numbers = '';
        for (let i = 0; i < numberCount; i++) {
            numbers += Math.floor(Math.random() * 10);
        }
        
        const allChars = letters + numbers;
        const charArray = allChars.split('');
        
        for (let i = charArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [charArray[i], charArray[j]] = [charArray[j], charArray[i]];
        }
        
        return prefix + charArray.join('');
    };

    // Tạo nút ảnh bật/tắt
    const createToggleButton = () => {
        if (document.getElementById('check-toggle-btn')) return;
        
        const toggleBtn = document.createElement('img');
        toggleBtn.id = 'check-toggle-btn';
        toggleBtn.src = 'https://raw.githubusercontent.com/Minkuanng/Image/refs/heads/main/QuangDevTool.png';
        toggleBtn.alt = 'Toggle Check';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 999999;
            width: 40px;
            height: 40px;
            cursor: pointer;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.3);
            transition: all 0.3s;
        `;
        
        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.transform = 'scale(1.15)';
            toggleBtn.style.boxShadow = '0 5px 15px rgba(0,0,0,0.4)';
            toggleBtn.style.borderColor = '#00ffff';
        });
        
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.transform = 'scale(1)';
            toggleBtn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
            toggleBtn.style.borderColor = 'rgba(255,255,255,0.3)';
        });
        
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (isInitializing) {
                return;
            }
            
            if (isUIVisible) {
                hideMainUI();
            } else {
                showMainUI();
            }
        });
        
        document.body.appendChild(toggleBtn);
        console.log('✅ Nút toggle đã được tạo!');
    };

    // Hiển thị main UI
    const showMainUI = async () => {
        if (isUIVisible || isInitializing) return;
        
        isInitializing = true;
        
        try {
            await loadCryptoJS();
            loadHistory();
            
            const isMobile = window.innerWidth <= 768;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            if (mainUI && document.body.contains(mainUI)) {
                mainUI.style.display = 'flex';
                mainUI.style.opacity = '0';
                
                setTimeout(() => {
                    if (mainUI) {
                        mainUI.style.transition = 'opacity 0.3s ease-out';
                        mainUI.style.opacity = '1';
                    }
                }, 10);
                
                isUIVisible = true;
                isInitializing = false;
                
                updateHistoryDisplay();
                return;
            }
            
            mainUI = document.createElement("div");
            mainUI.id = 'check-main-ui';
            
            if (isMobile) {
                mainUI.style.cssText = `
                    position: fixed;
                    top: 60px;
                    left: 5px;
                    right: 5px;
                    z-index: 999998;
                    background: rgba(15, 15, 25, 0.98);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border-radius: 10px;
                    padding: 12px;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(100, 100, 255, 0.3);
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    max-height: ${screenHeight - 80}px;
                    overflow: hidden;
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                `;
            } else {
                mainUI.style.cssText = `
                    position: fixed;
                    top: 70px;
                    left: 10px;
                    z-index: 999998;
                    width: ${Math.min(500, screenWidth - 20)}px;
                    background: rgba(15, 15, 25, 0.98);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border-radius: 10px;
                    padding: 12px;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(100, 100, 255, 0.3);
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    max-height: ${screenHeight - 90}px;
                    overflow: hidden;
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                `;
            }
            
            // Container chính
            const mainContainer = document.createElement("div");
            mainContainer.style.cssText = `
                flex: 0 0 auto;
                padding: 10px;
                min-width: 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            `;
            
            // Header
            const header = document.createElement("div");
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.15);
            `;
            
            const title = document.createElement("div");
            title.textContent = "🔍 AUTO CHECK CODE";
            title.style.cssText = `
                font-weight: bold;
                font-size: 14px;
                color: #fff;
                text-shadow: 0 0 8px rgba(255,255,255,0.3);
            `;
            
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "✕";
            closeBtn.style.cssText = `
                padding: 4px 8px;
                background: rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.7);
                border: none;
                border-radius: 50%;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = "rgba(255,0,0,0.5)";
                closeBtn.style.color = "white";
            });
            
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = "rgba(255,255,255,0.1)";
                closeBtn.style.color = "rgba(255,255,255,0.7)";
            });
            
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideMainUI();
            });
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            // Ô hiển thị mã
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Mã sẽ tự động tạo...";
            input.readOnly = true;
            input.style.cssText = `
                width: 100%;
                padding: 10px 12px;
                margin-bottom: 12px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.4);
                color: #39FF14;
                font-size: 13px;
                outline: none;
                box-sizing: border-box;
                transition: all 0.3s;
                text-align: center;
                font-weight: bold;
                cursor: default;
            `;
            
            // Nút start/stop
            const actionBtn = document.createElement("button");
            actionBtn.id = 'check-action-btn';
            actionBtn.textContent = "▶️ START CHECK";
            actionBtn.title = "Tự động tạo mã và check liên tục";
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
            
            actionBtn.addEventListener('mouseenter', () => {
                if (!actionBtn.disabled) {
                    actionBtn.style.transform = "scale(1.03)";
                    actionBtn.style.boxShadow = "0 5px 15px rgba(0,176,155,0.4)";
                }
            });
            
            actionBtn.addEventListener('mouseleave', () => {
                actionBtn.style.transform = "scale(1)";
                actionBtn.style.boxShadow = "none";
            });
            
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Vùng hiển thị trạng thái
            const statusDisplay = document.createElement("div");
            statusDisplay.id = 'check-status';
            statusDisplay.textContent = "• Ready";
            statusDisplay.style.cssText = `
                color: #39FF14;
                font-size: 12px;
                text-align: center;
                padding: 8px 0;
                min-height: 20px;
                transition: all 0.2s;
                word-break: break-word;
                line-height: 1.4;
            `;
            
            // Container history
            const historyContainer = document.createElement("div");
            historyContainer.style.cssText = `
                flex: 1;
                padding: 10px;
                min-width: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;
            
            // Header history
            const historyHeader = document.createElement("div");
            historyHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.15);
            `;
            
            const historyTitle = document.createElement("div");
            historyTitle.textContent = "📜 FULL HISTORY";
            historyTitle.style.cssText = `
                font-weight: bold;
                font-size: 13px;
                color: #fff;
            `;
            
            const clearHistoryBtn = document.createElement("button");
            clearHistoryBtn.textContent = "🗑️ Xoá All";
            clearHistoryBtn.title = "Xóa toàn bộ lịch sử";
            clearHistoryBtn.style.cssText = `
                padding: 4px 8px;
                background: rgba(255, 50, 50, 0.2);
                color: #ff6666;
                border: 1px solid rgba(255, 50, 50, 0.3);
                border-radius: 5px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            clearHistoryBtn.addEventListener('mouseenter', () => {
                clearHistoryBtn.style.background = "rgba(255, 50, 50, 0.4)";
                clearHistoryBtn.style.color = "#ff9999";
            });
            
            clearHistoryBtn.addEventListener('mouseleave', () => {
                clearHistoryBtn.style.background = "rgba(255, 50, 50, 0.2)";
                clearHistoryBtn.style.color = "#ff6666";
            });
            
            clearHistoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Xóa toàn bộ lịch sử check?")) {
                    historyList = [];
                    saveHistory();
                    updateHistoryDisplay();
                }
            });
            
            historyHeader.appendChild(historyTitle);
            historyHeader.appendChild(clearHistoryBtn);
            
            // History content
            const historyContent = document.createElement("div");
            historyContent.id = 'check-history-content';
            historyContent.style.cssText = `
                flex: 1;
                overflow-y: auto;
                padding-right: 5px;
                max-height: ${isMobile ? '180px' : '220px'};
                margin-bottom: 8px;
            `;
            
            historyContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Kết quả tìm kiếm
            const searchResult = document.createElement("div");
            searchResult.id = 'search-result';
            searchResult.style.cssText = `
                display: none;
                color: #FFFF00;
                font-size: 10px;
                text-align: center;
                padding: 4px;
                margin-bottom: 5px;
                background: rgba(255, 255, 0, 0.1);
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 0, 0.2);
            `;
            
            // BOT TÌM TÊN & XOÁ (NHỎ GỌN)
            const botContainer = document.createElement("div");
            botContainer.style.cssText = `
                padding: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 6px;
                border: 1px solid rgba(255, 100, 100, 0.2);
                margin-top: 5px;
            `;
            
            // Input tìm tên (nhỏ gọn)
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.placeholder = "🔍 Nhập tên để tìm/auto xoá...";
            nameInput.style.cssText = `
                width: 100%;
                padding: 8px 10px;
                border: 1px solid rgba(255, 100, 100, 0.4);
                border-radius: 6px;
                background: rgba(0, 0, 0, 0.5);
                color: #fff;
                font-size: 11px;
                outline: none;
                box-sizing: border-box;
                transition: all 0.3s;
            `;
            
            // Thêm placeholder nhỏ hơn
            const placeholderStyle = document.createElement("style");
            placeholderStyle.textContent = `
                input::placeholder {
                    color: rgba(255, 200, 200, 0.7);
                    font-size: 10px;
                }
            `;
            document.head.appendChild(placeholderStyle);
            
            // Sự kiện input thay đổi
            let searchTimeout = null;
            nameInput.addEventListener('input', (e) => {
                e.stopPropagation();
                
                // Clear timeout cũ
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                
                // Tự động tìm kiếm sau 500ms
                searchTimeout = setTimeout(() => {
                    findAndDeleteByName(nameInput.value);
                }, 500);
            });
            
            // Enter để xoá ngay
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    e.preventDefault();
                    findAndDeleteByName(nameInput.value);
                }
            });
            
            // Focus để xoá placeholder
            nameInput.addEventListener('focus', (e) => {
                e.stopPropagation();
                nameInput.style.borderColor = '#FF6666';
                nameInput.style.boxShadow = '0 0 5px rgba(255, 100, 100, 0.5)';
            });
            
            nameInput.addEventListener('blur', (e) => {
                e.stopPropagation();
                nameInput.style.borderColor = 'rgba(255, 100, 100, 0.4)';
                nameInput.style.boxShadow = 'none';
            });
            
            // Thêm CSS
            const style = document.createElement("style");
            style.id = 'check-styles';
            if (!document.getElementById('check-styles')) {
                style.textContent = `
                    @keyframes statusSlide {
                        from { opacity: 0; transform: translateY(-5px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulseGreen {
                        0% { box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(0, 176, 155, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(0, 176, 155, 0); }
                    }
                    @keyframes pulseRed {
                        0% { box-shadow: 0 0 0 0 rgba(255, 100, 100, 0.7); }
                        70% { box-shadow: 0 0 0 5px rgba(255, 100, 100, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(255, 100, 100, 0); }
                    }
                    #check-history-content::-webkit-scrollbar {
                        width: 6px;
                    }
                    #check-history-content::-webkit-scrollbar-track {
                        background: rgba(0,0,0,0.2);
                        border-radius: 5px;
                    }
                    #check-history-content::-webkit-scrollbar-thumb {
                        background: rgba(100,100,255,0.4);
                        border-radius: 5px;
                    }
                    #check-history-content::-webkit-scrollbar-thumb:hover {
                        background: rgba(100,100,255,0.6);
                    }
                    .auto-check-active {
                        animation: pulseGreen 2s infinite;
                    }
                    .code-display {
                        font-family: 'Courier New', monospace;
                        letter-spacing: 1px;
                    }
                    .history-item:hover {
                        background: rgba(255,255,255,0.08) !important;
                    }
                    .search-highlight {
                        animation: pulseRed 1s infinite;
                        border-left: 3px solid #FFFF00 !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Ghép các phần tử
            mainContainer.appendChild(header);
            mainContainer.appendChild(input);
            mainContainer.appendChild(actionBtn);
            mainContainer.appendChild(statusDisplay);
            
            historyContainer.appendChild(historyHeader);
            historyContainer.appendChild(searchResult);
            historyContainer.appendChild(historyContent);
            historyContainer.appendChild(botContainer); // Bot nhỏ gọn ở dưới cùng
            botContainer.appendChild(nameInput); // Chỉ có input
            
            mainUI.appendChild(mainContainer);
            mainUI.appendChild(historyContainer);
            
            document.body.appendChild(mainUI);
            
            mainUI.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            setTimeout(() => {
                if (mainUI) {
                    mainUI.style.opacity = '1';
                }
            }, 10);
            
            isUIVisible = true;
            isInitializing = false;
            
            setupCheckLogic(mainUI, title, input, actionBtn, statusDisplay, closeBtn);
            
        } catch (error) {
            console.error('❌ Lỗi khi hiển thị UI:', error);
            isInitializing = false;
        }
    };

    // Ẩn main UI
    const hideMainUI = () => {
        if (!mainUI || !isUIVisible) return;
        
        if (isAutoCheckRunning) {
            stopAutoCheck();
        }
        
        isUIVisible = false;
        
        if (mainUI) {
            mainUI.style.opacity = '0';
            mainUI.style.transition = 'opacity 0.3s ease-out';
            
            setTimeout(() => {
                if (mainUI && document.body.contains(mainUI)) {
                    mainUI.style.display = 'none';
                }
            }, 300);
        }
    };

    // Bắt đầu auto check
    const startAutoCheck = (input, actionBtn, statusDisplay) => {
        if (isAutoCheckRunning) return;
        
        isAutoCheckRunning = true;
        actionBtn.textContent = "⏹️ STOP CHECK";
        actionBtn.style.background = "linear-gradient(135deg, #ff416c, #ff4b2b)";
        actionBtn.classList.add('auto-check-active');
        
        updateStatus(statusDisplay, "🚀 Đang chạy auto check...", "#00FF00");
        
        console.log('🚀 Bắt đầu auto check...');
    };

    // Dừng auto check
    const stopAutoCheck = (actionBtn, statusDisplay) => {
        if (!isAutoCheckRunning) return;
        
        isAutoCheckRunning = false;
        if (autoCheckIntervalId) {
            clearInterval(autoCheckIntervalId);
            autoCheckIntervalId = null;
        }
        
        if (actionBtn) {
            actionBtn.textContent = "▶️ START CHECK";
            actionBtn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";
            actionBtn.classList.remove('auto-check-active');
        }
        
        if (statusDisplay) {
            updateStatus(statusDisplay, "• Đã dừng", "#39FF14");
        }
        
        console.log('🛑 Dừng auto check');
    };

    // Cập nhật trạng thái
    const updateStatus = (statusDisplay, message, color = "#39FF14") => {
        if (!statusDisplay) return;
        
        statusDisplay.textContent = message;
        statusDisplay.style.color = color;
        
        statusDisplay.style.animation = 'none';
        void statusDisplay.offsetWidth;
        statusDisplay.style.animation = 'statusSlide 0.3s ease-out';
    };

    // Setup logic check
    const setupCheckLogic = (mainUI, title, input, actionBtn, statusDisplay, closeBtn) => {
        
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
        
        // Hàm check mã
        const checkCode = async (code) => {
            try {
                const token = localStorage.getItem("token");
                const userId = localStorage.getItem("userId") || localStorage.getItem("uid");
                const cuid = localStorage.getItem("__DC_STAT_UUID") || "176633339559965073US";
                
                if (!token || !userId) {
                    updateStatus(statusDisplay, "⚠️ Chưa đăng nhập", "#FF4444");
                    addToHistory(code, "error", "Chưa đăng nhập");
                    return false;
                }
                
                if (!code) {
                    updateStatus(statusDisplay, "⚠️ Lỗi tạo mã", "#FF4444");
                    return false;
                }
                
                currentCode = code;
                updateStatus(statusDisplay, `⏳ Đang check: ${code}`, "#FFAA00");
                
                const params = {
                    cuid,
                    redeemCodes: code,
                    redeemType: "S01",
                    ts: Date.now(),
                    userId: userId
                };
                
                console.log('📤 Check mã:', code);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                let response;
                try {
                    response = await fetch("https://api.vipplayer.net/cpCgw/mkt/redeem_code/exchange", {
                        method: "POST",
                        headers: {
                            "content-type": "application/x-www-form-urlencoded",
                            "authorization": `Bearer ${token}`,
                            "x-signature": generateSignature(params)
                        },
                        body: toQueryString(params),
                        signal: controller.signal
                    });
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    updateStatus(statusDisplay, "⚠️ Lỗi kết nối", "#FFAA00");
                    addToHistory(code, "error", "Lỗi kết nối mạng");
                    return false;
                }
                
                clearTimeout(timeoutId);
                
                console.log('📥 Response status:', response.status);
                
                if (!response.ok) {
                    updateStatus(statusDisplay, `⚠️ Lỗi server: ${response.status}`, "#FF4444");
                    addToHistory(code, "error", `Lỗi server: ${response.status}`);
                    return false;
                }
                
                let data;
                try {
                    data = await response.json();
                    console.log('📥 Response data:', data);
                } catch (jsonError) {
                    updateStatus(statusDisplay, "⚠️ Lỗi phân tích dữ liệu", "#FF4444");
                    addToHistory(code, "error", "Lỗi phân tích dữ liệu");
                    return false;
                }
                
                // Xử lý kết quả
                const message = data.data?.failList?.[0]?.failReason || data.msg || "Không xác định";
                const translated = await translate(message);
                
                let status = "warning";
                let color = "#FFAA00";
                let displayMessage = translated || message;
                
                // Phân loại kết quả
                if (data.data?.successList?.length > 0) {
                    status = "success";
                    color = "#00FF00";
                    displayMessage = "Thành công!";
                } else if (message.includes("không tồn tại") || message.includes("không hợp lệ")) {
                    status = "error";
                    color = "#FF66FF";
                } else if (message.includes("đã nhận") || message.includes("đã sử dụng")) {
                    status = "warning";
                    color = "#FFAA00";
                } else if (message.includes("hết hạn")) {
                    status = "warning";
                    color = "#4488FF";
                } else {
                    status = "error";
                    color = "#FF4444";
                }
                
                // Giới hạn độ dài message
                const maxLength = window.innerWidth <= 768 ? 20 : 25;
                if (displayMessage.length > maxLength) {
                    displayMessage = displayMessage.substring(0, maxLength) + "...";
                }
                
                updateStatus(statusDisplay, `${getStatusIcon(status)} ${code}: ${displayMessage}`, color);
                addToHistory(code, status, displayMessage);
                
                // Nếu thành công, reload trang
                if (status === "success") {
                    setTimeout(() => window.location.reload(), 1000);
                    return true;
                }
                
            } catch (error) {
                console.error('❌ Lỗi check mã:', error);
                updateStatus(statusDisplay, "⚠️ Lỗi không xác định", "#FF4444");
                addToHistory(code, "error", "Lỗi không xác định");
            }
            return false;
        };
        
        // Hàm thực hiện 1 chu kỳ check
        const checkCycle = async () => {
            if (!isAutoCheckRunning) return;
            
            // Tạo mã mới
            const randomCode = generateRandomtxyCode();
            input.value = randomCode;
            input.classList.add('code-display');
            
            // Check mã
            const success = await checkCode(randomCode);
            
            // Nếu thành công, dừng auto check
            if (success) {
                stopAutoCheck(actionBtn, statusDisplay);
            }
        };
        
        // Nút start/stop
        actionBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            if (!isAutoCheckRunning) {
                // Kiểm tra đăng nhập
                const token = localStorage.getItem("token");
                const userId = localStorage.getItem("userId") || localStorage.getItem("uid");
                
                if (!token || !userId) {
                    updateStatus(statusDisplay, "⚠️ Chưa đăng nhập", "#FF4444");
                    addToHistory("System", "error", "Chưa đăng nhập");
                    return;
                }
                
                // Bắt đầu auto check
                startAutoCheck(input, actionBtn, statusDisplay);
                
                // Chạy ngay chu kỳ đầu tiên
                await checkCycle();
                
                // Lặp lại
                autoCheckIntervalId = setInterval(async () => {
                    await checkCycle();
                }, AUTO_CHECK_INTERVAL);
                
            } else {
                // Dừng auto check
                stopAutoCheck(actionBtn, statusDisplay);
            }
        });
        
        // Phím tắt
        const handleKeydown = (e) => {
            if (!isUIVisible) return;
            
            if (e.key === ' ' || (e.ctrlKey && e.key === 'a')) {
                e.preventDefault();
                actionBtn.click();
            }
            
            if (e.key === 'Escape' && e.target !== input) {
                hideMainUI();
                e.preventDefault();
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        
        // Khởi tạo
        updateStatus(statusDisplay, "• Ready", "#39FF14");
        input.value = "txy00000000abcd";
        input.classList.add('code-display');
        updateHistoryDisplay();
    };

    // Khởi tạo
    const init = () => {
        console.log('🚀 Auto Check Tool Mobile đang khởi động...');
        createToggleButton();
        console.log('👉 Click vào ảnh góc trên phải để mở tool');
    };

    // Chờ trang load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Xử lý click ngoài để ẩn UI
    document.addEventListener('click', (e) => {
        if (!isUIVisible) return;
        
        const toggleBtn = document.getElementById('check-toggle-btn');
        const isClickInsideUI = mainUI && mainUI.contains(e.target);
        const isClickOnToggle = toggleBtn && toggleBtn.contains(e.target);
        
        if (!isClickInsideUI && !isClickOnToggle) {
            hideMainUI();
        }
    });
})();

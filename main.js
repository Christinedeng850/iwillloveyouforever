let moments = JSON.parse(localStorage.getItem('coupleMoments') || '[]');
let settings = JSON.parse(localStorage.getItem('coupleSettings') || '{"names":["Me","You"],"anniversary":null}');
let memories = JSON.parse(localStorage.getItem('coupleMemories') || '[]');
let selectedImages = [];
let memoryFiles = [];
let currentCalendarDate = new Date();
let selectedCalendarDate = null;

const CORRECT_PASSWORD = 'love0214';

document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        unlockApp();
    }
});

function isLoggedIn() {
    return localStorage.getItem('coupleLoggedIn') === 'true';
}

function checkPassword() {
    const input = document.getElementById('passwordInput');
    const error = document.getElementById('loginError');
    if (input.value === CORRECT_PASSWORD) {
        localStorage.setItem('coupleLoggedIn', 'true');
        unlockApp();
    } else {
        error.textContent = 'Incorrect password, please try again';
        input.value = '';
    }
}

function unlockApp() {
    document.getElementById('loginOverlay').classList.add('hidden');
    renderTimeline();
    renderGallery();
    renderMemories();
    renderCalendar();
    updateAnniversary();
    loadSettings();
    setupEventListeners();
    setDefaultMemoryDate();
}

function setDefaultMemoryDate() {
    const today = new Date().toISOString().split('T')[0];
    const input = document.getElementById('memoryDateInput');
    if (input) input.value = today;
}

function setupEventListeners() {
    document.getElementById('momentForm').addEventListener('submit', handleMomentSubmit);
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tab) {
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('timelineView').style.display = tab === 'timeline' ? 'block' : 'none';
    document.getElementById('memoriesView').style.display = tab === 'memories' ? 'block' : 'none';
    document.getElementById('galleryView').style.display = tab === 'gallery' ? 'block' : 'none';
    document.getElementById('settingsView').style.display = tab === 'settings' ? 'block' : 'none';
    if (tab === 'settings') loadSettingsToForm();
}

function renderTimeline() {
    const timeline = document.getElementById('timeline');
    if (moments.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <div class="icon">&#128150;</div>
                <p>No moments yet~</p>
                <p>Start recording your first moment together!</p>
            </div>
        `;
        return;
    }
    const sorted = [...moments].sort((a, b) => new Date(b.date) - new Date(a.date));
    timeline.innerHTML = sorted.map((moment, index) => {
        const originalIdx = moments.findIndex(m => m.id === moment.id);
        return `
        <div class="moment-card">
            <div class="moment-header">
                <div class="avatar">${moment.author[0]}</div>
                <div class="moment-meta">
                    <div class="moment-author">${escapeHtml(moment.author)}</div>
                    <div class="moment-date">${formatDate(moment.date)}</div>
                </div>
            </div>
            <div class="moment-content">${escapeHtml(moment.content)}</div>
            ${moment.images.length > 0 ? `
                <div class="moment-images">
                    ${moment.images.map(img => `<img src="${img}" alt="photo" onclick="openModal('${img}')">`).join('')}
                </div>
            ` : ''}
            <div class="moment-actions">
                <button class="action-btn ${moment.liked ? 'liked' : ''}" onclick="toggleLike(${originalIdx})">
                    <span class="heart-icon">${moment.liked ? '&#10084;&#65039;' : '&#129293;'}</span>
                    <span>${moment.likes || 0}</span>
                </button>
                <button class="action-btn" onclick="focusComment(${originalIdx})">
                    <span>&#128172;</span>
                    <span>${moment.comments?.length || 0}</span>
                </button>
            </div>
            ${moment.comments?.length > 0 ? `
                <div class="comments-section">
                    ${moment.comments.map(c => `
                        <div class="comment">
                            <div class="comment-avatar">${c.author[0]}</div>
                            <div class="comment-content">
                                <span class="comment-author">${escapeHtml(c.author)}:</span>${escapeHtml(c.text)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="comment-input-wrap" id="commentWrap${originalIdx}">
                <input type="text" class="comment-input" id="commentInput${originalIdx}" placeholder="Write a reply..." onkeypress="handleCommentKey(event, ${originalIdx})">
                <button class="comment-submit" onclick="addComment(${originalIdx})">Send</button>
            </div>
        </div>
        `;
    }).join('');
}

function handleMomentSubmit(e) {
    e.preventDefault();
    const author = document.querySelector('input[name="author"]:checked').value;
    const content = document.getElementById('momentText').value;
    if (!content.trim()) { alert('Please enter some content'); return; }
    const moment = {
        id: Date.now(),
        author: author === 'Me' ? settings.names[0] : settings.names[1],
        content: content.trim(),
        images: selectedImages,
        date: new Date().toISOString(),
        likes: 0,
        liked: false,
        comments: []
    };
    moments.push(moment);
    saveData();
    renderTimeline();
    renderGallery();
    document.getElementById('momentText').value = '';
    selectedImages = [];
    document.getElementById('imageUpload').innerHTML = `
        <div class="image-upload-item" onclick="triggerImageInput()">
            <span>+</span>
        </div>
    `;
}

function triggerImageInput() { document.getElementById('imageInput').click(); }

function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => { selectedImages.push(e.target.result); renderImagePreviews(); };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

function renderImagePreviews() {
    const container = document.getElementById('imageUpload');
    container.innerHTML = selectedImages.map((img, i) => `
        <div class="image-upload-item">
            <img src="${img}" alt="preview">
            <button class="remove-btn" onclick="removeImage(${i})">&#215;</button>
        </div>
    `).join('') + `
        <div class="image-upload-item" onclick="triggerImageInput()">
            <span>+</span>
        </div>
    `;
}

function removeImage(index) { selectedImages.splice(index, 1); renderImagePreviews(); }

function toggleLike(index) {
    const moment = moments[index];
    if (moment) {
        moment.liked = !moment.liked;
        moment.likes = (moment.likes || 0) + (moment.liked ? 1 : -1);
        saveData();
        renderTimeline();
    }
}

function focusComment(index) { document.getElementById(`commentInput${index}`).focus(); }
function handleCommentKey(e, index) { if (e.key === 'Enter') addComment(index); }

function addComment(index) {
    const moment = moments[index];
    const input = document.getElementById(`commentInput${index}`);
    const text = input.value.trim();
    if (!text) return;
    if (!moment.comments) moment.comments = [];
    moment.comments.push({ author: settings.names[0], text: text, date: new Date().toISOString() });
    saveData();
    renderTimeline();
}

function toggleMemoryForm() {
    const form = document.getElementById('memoryForm');
    form.classList.toggle('active');
    if (form.classList.contains('active')) {
        memoryFiles = [];
        document.getElementById('memoryPreview').innerHTML = '';
        document.getElementById('memoryNoteInput').value = '';
        setDefaultMemoryDate();
    }
}

function handleMemoryFiles(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            memoryFiles.push(ev.target.result);
            renderMemoryPreview();
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

function renderMemoryPreview() {
    const container = document.getElementById('memoryPreview');
    container.innerHTML = memoryFiles.map((img, i) => `
        <img src="${img}" alt="preview">
    `).join('');
}

function submitMemory() {
    const date = document.getElementById('memoryDateInput').value;
    const note = document.getElementById('memoryNoteInput').value.trim();
    if (!date) { alert('Please select a date'); return; }
    if (memoryFiles.length === 0) { alert('Please upload at least one photo'); return; }

    memoryFiles.forEach(img => {
        memories.push({
            id: Date.now() + Math.random(),
            image: img,
            date: date,
            note: note || '',
            created: new Date().toISOString()
        });
    });

    saveData();
    renderMemories();
    renderCalendar();
    toggleMemoryForm();
}

function deleteMemory(id) {
    if (confirm('Delete this memory?')) {
        memories = memories.filter(m => m.id !== id);
        saveData();
        renderMemories();
        renderCalendar();
    }
}

function renderMemories(filterDate) {
    const stream = document.getElementById('memoriesStream');
    let display = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filterDate) {
        display = display.filter(m => m.date === filterDate);
    }

    if (display.length === 0) {
        stream.innerHTML = `
            <div class="empty-state" style="flex:1;">
                <div class="icon">&#128248;</div>
                <p>${filterDate ? 'No memories on this date' : 'No memories yet~'}</p>
                <p>Click "+ Add Memory" to start!</p>
            </div>
        `;
        return;
    }

    stream.innerHTML = display.map(m => `
        <div class="memory-card" onclick="openModal('${m.image}')">
            <img src="${m.image}" alt="memory">
            <button class="memory-delete" onclick="event.stopPropagation(); deleteMemory('${m.id}')">&#215;</button>
            <div class="memory-info">
                <div class="memory-date">${formatDateNice(m.date)}</div>
                ${m.note ? `<div class="memory-note">${escapeHtml(m.note)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    const photoDates = new Set(memories.map(m => m.date));

    let html = '';
    let dayCount = 1;
    let nextMonthDay = 1;

    for (let row = 0; row < 6; row++) {
        html += '<tr>';
        for (let col = 0; col < 7; col++) {
            const cellIndex = row * 7 + col;
            if (cellIndex < firstDay) {
                const d = prevDaysInMonth - firstDay + 1 + cellIndex;
                html += `<td class="other-month">${d}</td>`;
            } else if (dayCount <= daysInMonth) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
                const hasPhoto = photoDates.has(dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isSelected = selectedCalendarDate === dateStr;
                let classes = [];
                if (hasPhoto) classes.push('has-photo');
                if (isToday) classes.push('today');
                if (isSelected) classes.push('selected');
                html += `<td class="${classes.join(' ')}" onclick="onCalendarClick('${dateStr}', ${hasPhoto})">${dayCount}</td>`;
                dayCount++;
            } else {
                html += `<td class="other-month">${nextMonthDay}</td>`;
                nextMonthDay++;
            }
        }
        html += '</tr>';
    }

    document.getElementById('calendarBody').innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function onCalendarClick(dateStr, hasPhoto) {
    selectedCalendarDate = dateStr;
    renderCalendar();
    if (hasPhoto) {
        renderMemories(dateStr);
    } else {
        renderMemories();
    }
}

function renderGallery() {
    const gallery = document.getElementById('gallery');
    const allImages = [];
    moments.forEach(m => {
        m.images.forEach(img => { allImages.push({ ...m, image: img }); });
    });
    if (allImages.length === 0) {
        gallery.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="icon">&#128247;</div>
                <p>No photos yet~</p>
            </div>
        `;
        return;
    }
    gallery.innerHTML = allImages.map(item => `
        <div class="gallery-item" onclick="openModal('${item.image}')">
            <img src="${item.image}" alt="photo">
            <div class="overlay">${escapeHtml(item.author)} &middot; ${formatDateNice(item.date)}</div>
        </div>
    `).join('');
}

function updateAnniversary() {
    const daysEl = document.getElementById('daysCount');
    const inputEl = document.getElementById('anniversaryInput');
    if (settings.anniversary) {
        const start = new Date(settings.anniversary);
        const now = new Date();
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        daysEl.textContent = diff;
        daysEl.parentElement.querySelector('.anniversary-label').textContent = 'Days Together';
        inputEl.style.display = 'none';
    } else {
        daysEl.innerHTML = '&#128150;';
        daysEl.parentElement.querySelector('.anniversary-label').textContent = 'Set your anniversary to start counting!';
        inputEl.style.display = 'flex';
    }
}

function saveAnniversary() {
    const date = document.getElementById('anniversaryDate').value;
    if (date) { settings.anniversary = date; saveData(); updateAnniversary(); }
}

function saveAnniversaryFromSettings() {
    const date = document.getElementById('anniversaryDateSettings').value;
    if (date) { settings.anniversary = date; saveData(); updateAnniversary(); alert('Anniversary saved!'); }
}

function loadSettings() {
    if (settings.names) {
        document.title = `iwillloveyouforever.com - ${settings.names[0]} & ${settings.names[1]}`;
    }
}

function loadSettingsToForm() {
    document.getElementById('name1').value = settings.names[0] || '';
    document.getElementById('name2').value = settings.names[1] || '';
    document.getElementById('anniversaryDateSettings').value = settings.anniversary || '';
}

function saveNames() {
    const name1 = document.getElementById('name1').value.trim();
    const name2 = document.getElementById('name2').value.trim();
    if (name1 && name2) {
        settings.names = [name1, name2];
        saveData();
        loadSettings();
        alert('Names saved!');
    }
}

function exportData() {
    const data = { moments, settings, memories, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iwillloveyouforever_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() { document.getElementById('importInput').click(); }

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.moments && data.settings) {
                if (confirm('Importing will overwrite existing data. Continue?')) {
                    moments = data.moments;
                    settings = data.settings;
                    if (data.memories) memories = data.memories;
                    saveData();
                    renderTimeline();
                    renderGallery();
                    renderMemories();
                    renderCalendar();
                    updateAnniversary();
                    loadSettings();
                    alert('Data imported successfully!');
                }
            } else { alert('Invalid file format'); }
        } catch (err) { alert('Failed to read file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
        moments = [];
        memories = [];
        settings = { names: ['Me', 'You'], anniversary: null };
        saveData();
        renderTimeline();
        renderGallery();
        renderMemories();
        renderCalendar();
        updateAnniversary();
        alert('All data cleared');
    }
}

function openModal(src) {
    document.getElementById('modalImage').src = src;
    document.getElementById('imageModal').classList.add('active');
}

function closeModal() { document.getElementById('imageModal').classList.remove('active'); }

function saveData() {
    localStorage.setItem('coupleMoments', JSON.stringify(moments));
    localStorage.setItem('coupleSettings', JSON.stringify(settings));
    localStorage.setItem('coupleMemories', JSON.stringify(memories));
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatDateNice(dateStr) {
    const d = new Date(dateStr);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function logout() {
    localStorage.removeItem('coupleLoggedIn');
    location.reload();
}

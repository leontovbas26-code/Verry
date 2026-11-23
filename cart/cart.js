// Адрес бэкенда на Render
const BACKEND_URL = 'https://verry-server.onrender.com';

// Экранирование HTML: защита от XSS через названия товаров
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// Достаём массив товаров из localStorage (с защитой от битого JSON)
let cart = [];
try {
    const parsed = JSON.parse(localStorage.getItem('verry_cart'));
    if (Array.isArray(parsed)) cart = parsed;
} catch (e) { cart = []; }

// Сохранение состояния в localStorage и обновление экрана
function saveCart() {
    localStorage.setItem('verry_cart', JSON.stringify(cart));
    renderCart();
}

// Изменение количества товара (+1 / -1)
// ИСПРАВЛЕНО: сравнение id через String() — раньше число из каталога
// могло не совпасть со строкой из localStorage, и кнопки не работали.
// ВНИМАНИЕ: количество меняется только локально; баланс на сервере
// списывается при покупке через /api/buy (см. отчёт про синхронизацию).
function changeQuantity(id, delta) {
    const item = cart.find(p => String(p.id) === String(id));
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(p => String(p.id) !== String(id));
        }
        saveCart();
    }
}

// Удаление товара из корзины (локально, без возврата средств на сервере)
function removeItem(id) {
    cart = cart.filter(p => String(p.id) !== String(id));
    saveCart();
}

// Вывод товаров на страницу
function renderCart() {
    const listContainer = document.getElementById('cart-items-list');
    const summaryBlock = document.getElementById('cart-summary-block');
    const emptyMessage = document.getElementById('empty-message');

    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (cart.length === 0) {
        summaryBlock.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    summaryBlock.style.display = 'block';
    emptyMessage.style.display = 'none';

    let totalCount = 0;
    let totalPrice = 0;

    cart.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        totalCount += quantity;
        totalPrice += price * quantity;

        // ИСПРАВЛЕНО: классы приведены к тем, что реально есть в CSS
        // (были item-details/item-actions/quantity-controls/quantity-btn — без стилей).
        // Вместо битой картинки с placeholder.com — аккуратная заглушка в стиле каталога.
        const itemHtml = `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-image"><span>[ ${escapeHtml(item.category || 'Товар')} ]</span></div>
                    <div>
                        <div class="item-title">${escapeHtml(item.title)}</div>
                        <div class="item-price">${escapeHtml(price)} ₽</div>
                    </div>
                </div>
                <div class="item-controls">
                    <button class="delete-btn" onclick="removeItem(${Number(item.id)})">Удалить</button>
                    <div class="quantity-select">
                        <button onclick="changeQuantity(${Number(item.id)}, -1)">−</button>
                        <span>${escapeHtml(quantity)}</span>
                        <button onclick="changeQuantity(${Number(item.id)}, 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    document.getElementById('total-count').innerText = totalCount;
    document.getElementById('total-price').innerText = totalPrice + ' ₽';
}

// Читаем сессию в едином формате {username, role, balance}
function readSession() {
    const raw = localStorage.getItem('verry_user');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.username) return parsed;
        throw new Error('legacy');
    } catch (e) {
        return { username: raw, role: 'user', balance: 0 };
    }
}

// Отправка корзины на сервер
async function handleCheckout() {
    const checkoutBtn = document.getElementById('checkout-button');
    if (cart.length === 0) return;

    // ИСПРАВЛЕНО: заказ нельзя оформить без входа — сервер должен знать, кто покупает
    const session = readSession();
    if (!session) {
        alert('Сначала войдите в Личный кабинет!');
        return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.innerText = 'Отправка...';

    try {
        // ИСПРАВЛЕНО: запрос шёл на корень домена (POST /), а не на API-эндпоинт.
        // ВАЖНО: /api/checkout на сервере пока НЕ реализован — готовый код есть в отчёте.
        const response = await fetch(BACKEND_URL + '/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: session.username, items: cart }),
            signal: AbortSignal.timeout(60000)
        });

        if (response.status === 404) {
            alert('Сервер ещё не умеет оформлять заказы: эндпоинт /api/checkout не найден. Добавьте его на сервер (готовый код есть в отчёте).');
            return;
        }

        const data = await response.json();

        if (response.ok && data.success !== false) {
            alert('Заказ успешно оформлен!');
            cart = [];
            localStorage.removeItem('verry_cart');
            renderCart();
        } else {
            alert('Ошибка оформления: ' + (data.error || data.message || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        alert('Не удалось связаться с сервером. Если он спал на Render — попробуйте через минуту.');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'Оформить заказ';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', renderCart);

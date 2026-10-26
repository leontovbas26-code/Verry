// Адрес твоего бэкенда на Render (замени на свой актуальный URL)
const BACKEND_URL = 'https://onrender.com'; 

// Достаем массив товаров из localStorage
let cart = JSON.parse(localStorage.getItem('verry_cart')) || [];

// Сохранение состояния в localStorage и обновление экрана
function saveCart() {
    localStorage.setItem('verry_cart', JSON.stringify(cart));
    renderCart();
}

// Изменение количества товара (+1 / -1)
function changeQuantity(id, delta) {
    const item = cart.find(p => p.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(p => p.id !== id);
        }
        saveCart();
    }
}

// Удаление товара из корзины
function removeItem(id) {
    cart = cart.filter(p => p.id !== id);
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
        totalCount += item.quantity;
        totalPrice += item.price * item.quantity;

        const itemHtml = `
            <div class="cart-item">
                <img src="${item.image || 'https://placeholder.com'}" alt="${item.title}" class="item-image">
                <div class="item-details">
                    <div class="item-title">${item.title}</div>
                    <div class="item-price">${item.price} ₽</div>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="removeItem(${item.id})">Удалить</button>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });

    document.getElementById('total-count').innerText = totalCount;
    document.getElementById('total-price').innerText = totalPrice + ' ₽';
}

// Функция отправки корзины на сервер
async function handleCheckout() {
    const checkoutBtn = document.getElementById('checkout-button');
    if (cart.length === 0) return;

    checkoutBtn.disabled = true;
    checkoutBtn.innerText = 'Отправка...';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Обязательный заголовок для Express.js
            },
            body: JSON.stringify({ items: cart }) // Упаковываем массив в объект
        });

        const data = await response.json();

        if (response.ok) {
            alert('Заказ успешно оформлен!');
            cart = [];
            localStorage.removeItem('verry_cart');
            renderCart();
        } else {
            alert('Ошибка оформления: ' + (data.message || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        alert('Не удалось связаться с сервером. Проверь работу бэкенда.');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'Оформить заказ';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', renderCart);

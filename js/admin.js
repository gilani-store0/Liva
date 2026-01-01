// admin.js - النسخة النهائية المحسنة
console.log('🚀 بدء تحميل لوحة تحكم Queen Beauty');

let adminDb = null;
let siteCurrency = 'ج.س';
let currentEditingProductId = null;
let productToDelete = null;

// فحص الاتصال بقاعدة البيانات
async function checkFirestoreConnection() {
    try {
        console.log('🔍 اختبار الاتصال بقاعدة البيانات...');
        
        // محاولة قراءة من مجموعة settings
        const settingsRef = window.firebaseModules.collection(adminDb, "settings");
        const settingsSnapshot = await window.firebaseModules.getDocs(settingsRef);
        console.log('✅ اتصال قاعدة البيانات ناجح');
        
        // إذا لم تكن هناك إعدادات، أنشئها
        if (settingsSnapshot.empty) {
            console.log('⚠️ لا توجد إعدادات، سيتم إنشاؤها...');
            await createDefaultSettings();
        }
        
        return true;
    } catch (error) {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
        showToast('فشل الاتصال بقاعدة البيانات: ' + error.message, 'error');
        return false;
    }
}

// إنشاء إعدادات افتراضية
async function createDefaultSettings() {
    try {
        const settingsRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        
        const defaultSettings = {
            storeName: 'Queen Beauty',
            email: 'yxr.249@gmail.com',
            phone: '+249933002015',
            address: 'السودان - الخرطوم',
            shippingCost: 15,
            freeShippingLimit: 200,
            workingHours: 'من الأحد إلى الخميس: 9 صباحاً - 10 مساءً',
            aboutUs: 'متجر متخصص في بيع العطور ومستحضرات التجميل الأصلية',
            createdAt: window.firebaseModules.serverTimestamp(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        await window.firebaseModules.setDoc(settingsRef, defaultSettings);
        console.log('✅ تم إنشاء الإعدادات الافتراضية');
        return true;
    } catch (error) {
        console.error('❌ خطأ في إنشاء الإعدادات:', error);
        return false;
    }
}

// التهيئة الرئيسية
async function initAdminApp() {
    console.log('🔧 تهيئة لوحة التحكم...');
    
    // 1. التحقق من تسجيل الدخول
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    
    try {
        const userData = JSON.parse(savedUser);
        console.log('👤 بيانات المستخدم:', userData);
        
        // 2. التحقق من أن المستخدم ليس ضيفاً
        if (userData.isGuest) {
            showToast('الضيوف لا يمكنهم الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // 3. التحقق من صلاحيات الأدمن
        if (!userData.isAdmin && userData.role !== 'admin') {
            showToast('ليس لديك صلاحيات الدخول للوحة التحكم', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // 4. تهيئة Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyB1vNmCapPK0MI4H_Q0ilO7OnOgZa02jx0",
            authDomain: "queen-beauty-b811b.firebaseapp.com",
            projectId: "queen-beauty-b811b",
            storageBucket: "queen-beauty-b811b.firebasestorage.app",
            messagingSenderId: "418964206430",
            appId: "1:418964206430:web:8c9451fc56ca7f956bd5cf"
        };
        
        const adminApp = window.firebaseModules.initializeApp(firebaseConfig, 'AdminApp');
        adminDb = window.firebaseModules.getFirestore(adminApp);
        console.log('✅ Firebase مهيأ');
        
        // 5. اختبار الاتصال
        const connectionSuccess = await checkFirestoreConnection();
        if (!connectionSuccess) {
            throw new Error('فشل الاتصال بقاعدة البيانات');
        }
        
        // 6. إعداد الأحداث
        setupAdminEventListeners();
        
        // 7. تحميل البيانات
        await loadAdminDashboard();
        
        console.log('🎉 لوحة التحكم جاهزة');
        
    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error);
        showToast('حدث خطأ في تحميل لوحة التحكم: ' + error.message, 'error');
    }
}

// تحميل لوحة التحكم
async function loadAdminDashboard() {
    try {
        console.log('📊 تحميل البيانات...');
        
        // تحميل جميع الأقسام في نفس الوقت
        await Promise.all([
            loadAdminStats(),
            loadAdminProducts(),
            loadAdminUsers(),
            loadAdminSettings(),
            loadThemeSettings()
        ]);
        
        console.log('✅ تم تحميل جميع البيانات');
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

// تحميل الإحصائيات
async function loadAdminStats() {
    try {
        console.log('📈 جاري تحميل الإحصائيات...');
        
        // تحميل المستخدمين
        const usersSnapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.collection(adminDb, "users")
        );
        
        const regularUsers = usersSnapshot.docs.filter(doc => {
            const data = doc.data();
            return !data.isGuest && data.isAdmin !== true;
        }).length;
        
        document.getElementById('adminUsersCount').textContent = regularUsers;
        console.log('👥 عدد المستخدمين:', regularUsers);
        
        // تحميل المنتجات
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products"),
            window.firebaseModules.where("isActive", "==", true)
        );
        
        const productsSnapshot = await window.firebaseModules.getDocs(productsQuery);
        document.getElementById('adminProductsCount').textContent = productsSnapshot.size;
        console.log('📦 عدد المنتجات:', productsSnapshot.size);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الإحصائيات:', error);
        document.getElementById('adminUsersCount').textContent = '0';
        document.getElementById('adminProductsCount').textContent = '0';
    }
}

// تحميل المنتجات
async function loadAdminProducts() {
    try {
        console.log('📦 جاري تحميل المنتجات...');
        
        const productsList = document.getElementById('adminProductsList');
        if (!productsList) {
            console.error('❌ عنصر قائمة المنتجات غير موجود');
            return;
        }
        
        // عرض تحميل
        productsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="width: 40px; height: 40px; border: 4px solid #ddd; border-top-color: var(--secondary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p style="color: var(--gray-color);">جاري تحميل المنتجات...</p>
            </div>
        `;
        
        // جلب المنتجات
        const productsQuery = window.firebaseModules.query(
            window.firebaseModules.collection(adminDb, "products")
        );
        
        const snapshot = await window.firebaseModules.getDocs(productsQuery);
        console.log('📥 عدد المنتجات المستلمة:', snapshot.size);
        
        if (snapshot.empty) {
            console.log('⚠️ لا توجد منتجات');
            productsList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-box-open fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">لا توجد منتجات</h3>
                    <p style="color: var(--gray-color); margin-bottom: 20px;">قم بإضافة منتج جديد</p>
                    <button class="btn-primary" onclick="openAddProductModal()" 
                            style="padding: 12px 25px; background: var(--secondary-color); color: white; border: none; border-radius: 10px; font-family: 'Cairo'; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-plus"></i> إضافة منتج جديد
                    </button>
                </div>
            `;
            return;
        }
        
        // عرض المنتجات
        let productsHTML = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            
            console.log('📝 معالجة منتج:', product.name);
            
            const isNew = product.isNew === true;
            const isSale = product.isSale === true;
            const isBest = product.isBest === true;
            const isActive = product.isActive !== false;
            
            productsHTML += `
                <div class="admin-product-card" data-id="${productId}">
                    <div class="admin-product-image">
                        <img src="${product.image || 'https://via.placeholder.com/80x80'}" 
                             alt="${product.name}"
                             onerror="this.src='https://via.placeholder.com/80x80'">
                    </div>
                    <div class="admin-product-info">
                        <h4>${product.name || 'بدون اسم'}</h4>
                        <p><i class="fas fa-tag"></i> ${product.category || 'بدون فئة'}</p>
                        <p><i class="fas fa-money-bill"></i> ${product.price || 0} ${siteCurrency}</p>
                        <p><i class="fas fa-box"></i> المخزون: ${product.stock || 0}</p>
                        <div class="product-status">
                            <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? 'نشط' : 'غير نشط'}
                            </span>
                            ${isNew ? '<span class="status-badge new">جديد</span>' : ''}
                            ${isSale ? '<span class="status-badge sale">عرض</span>' : ''}
                            ${isBest ? '<span class="status-badge best">الأفضل</span>' : ''}
                        </div>
                    </div>
                    <div class="admin-product-actions">
                        <button class="action-icon-btn edit-btn" onclick="editProduct('${productId}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-icon-btn delete-btn" onclick="confirmDeleteProduct('${productId}')" title="تعطيل">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        productsList.innerHTML = productsHTML;
        console.log('✅ تم تحميل المنتجات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتجات:', error);
        document.getElementById('adminProductsList').innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--primary-color); margin-bottom: 10px;">خطأ في تحميل المنتجات</h3>
                <p style="color: var(--gray-color); margin-bottom: 20px;">${error.message}</p>
                <button class="btn-primary" onclick="loadAdminProducts()" 
                        style="padding: 12px 25px; background: var(--secondary-color); color: white; border: none; border-radius: 10px; font-family: 'Cairo'; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// تحميل المستخدمين
async function loadAdminUsers() {
    try {
        console.log('👥 جاري تحميل المستخدمين...');
        
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;
        
        const snapshot = await window.firebaseModules.getDocs(
            window.firebaseModules.collection(adminDb, "users")
        );
        
        console.log('📥 عدد المستخدمين المستلم:', snapshot.size);
        
        if (snapshot.empty) {
            usersList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-users fa-3x" style="color: var(--gray-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--primary-color);">لا يوجد مستخدمين</h3>
                </div>
            `;
            return;
        }
        
        let usersHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            
            // تخطي الضيوف
            if (user.isGuest) return;
            
            const joinDate = user.createdAt?.toDate ? 
                user.createdAt.toDate().toLocaleDateString('ar-SA') : 'غير محدد';
            
            const userType = user.isAdmin ? '👑 مسؤول' : '👤 مستخدم عادي';
            const userTypeClass = user.isAdmin ? 'admin-user' : 'regular-user';
            
            usersHTML += `
                <div class="user-card ${userTypeClass}" data-id="${userId}">
                    <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                        <img src="${user.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" 
                             alt="صورة المستخدم"
                             style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; color: var(--primary-color);">${user.name || 'بدون اسم'}</h4>
                            <p style="margin: 0 0 5px 0; color: var(--gray-color);"><i class="fas fa-envelope"></i> ${user.email || 'بدون بريد'}</p>
                            <p style="margin: 0 0 10px 0; color: ${user.isAdmin ? 'var(--secondary-color)' : 'var(--primary-color)'}; font-weight: bold;">
                                ${userType}
                            </p>
                            <div style="display: flex; gap: 15px; margin: 10px 0; flex-wrap: wrap;">
                                <span style="color: var(--gray-color);"><i class="fas fa-shopping-cart"></i> ${user.totalOrders || 0} طلبات</span>
                                <span style="color: var(--gray-color);"><i class="fas fa-money-bill-wave"></i> ${user.totalSpent || 0} ${siteCurrency}</span>
                            </div>
                            <p style="margin: 0; color: var(--gray-color); font-size: 14px;"><i class="fas fa-calendar-alt"></i> ${joinDate}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        usersList.innerHTML = usersHTML;
        console.log('✅ تم تحميل المستخدمين بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المستخدمين:', error);
        usersList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger-color); font-size: 40px; margin-bottom: 15px;"></i>
                <h4 style="color: var(--primary-color);">حدث خطأ في تحميل المستخدمين</h4>
                <button class="btn-primary" onclick="loadAdminUsers()" 
                        style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; margin-top: 10px; font-family: 'Cairo';">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// تحميل الإعدادات
async function loadAdminSettings() {
    try {
        console.log('⚙️ جاري تحميل الإعدادات...');
        
        const form = document.getElementById('settingsForm');
        if (!form) return;
        
        // جلب الإعدادات
        const configRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        const configDoc = await window.firebaseModules.getDoc(configRef);
        
        let config = {};
        if (configDoc.exists()) {
            config = configDoc.data();
            console.log('📄 الإعدادات المحملة:', config);
            
            // تحديث الشعار في القائمة الجانبية
            if (config.logoUrl) {
                const sidebarLogo = document.getElementById('adminSidebarLogo');
                if (sidebarLogo) sidebarLogo.src = config.logoUrl;
            }
        } else {
            console.log('⚠️ الإعدادات غير موجودة');
        }
        
        // إنشاء نموذج الإعدادات
        form.innerHTML = `
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                <h4><i class="fas fa-store"></i> معلومات المتجر</h4>
                
                <div class="form-group">
                    <label>اسم المتجر *</label>
                    <input type="text" id="storeName" value="${config.storeName || 'Queen Beauty'}" required>
                </div>

                <div class="form-group">
                    <label>رابط الشعار (Logo URL)</label>
                    <input type="url" id="logoUrl" value="${config.logoUrl || 'https://i.ibb.co/zTdN34JZ/127eaa50-e46b-11f0-be13-f18061e34a08-1.png'}" placeholder="https://example.com/logo.png">
                    <small>أدخل رابط الصورة التي تريد استخدامها كشعار للموقع</small>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>البريد الإلكتروني *</label>
                        <input type="email" id="email" value="${config.email || 'yxr.249@gmail.com'}" required>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف *</label>
                        <input type="tel" id="phone" value="${config.phone || config.Phone || '+249933002015'}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>العنوان *</label>
                    <input type="text" id="address" value="${config.address || 'السودان - الخرطوم'}" required>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                <h4><i class="fas fa-truck"></i> إعدادات الشحن</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>تكلفة الشحن (${siteCurrency})</label>
                        <input type="number" id="shippingCost" value="${config.shippingCost || 15}" min="0">
                    </div>
                    <div class="form-group">
                        <label>التوصيل المجاني من (${siteCurrency})</label>
                        <input type="number" id="freeShippingLimit" value="${config.freeShippingLimit || 200}" min="0">
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4><i class="fas fa-info-circle"></i> معلومات إضافية</h4>
                
                <div class="form-group">
                    <label>ساعات العمل</label>
                    <input type="text" id="workingHours" value="${config.workingHours || 'من الأحد إلى الخميس: 9 صباحاً - 10 مساءً'}">
                </div>
                
                <div class="form-group">
                    <label>وصف المتجر</label>
                    <textarea id="aboutUs" rows="3">${config.aboutUs || 'متجر متخصص في بيع العطور ومستحضرات التجميل الأصلية'}</textarea>
                </div>
            </div>
            
            <button type="button" id="saveSettingsBtn" class="btn-primary" style="width: 100%; padding: 15px;">
                <i class="fas fa-save"></i> حفظ الإعدادات
            </button>
        `;
        
        // إضافة حدث الحفظ
        document.getElementById('saveSettingsBtn').addEventListener('click', saveSiteSettings);
        console.log('✅ تم تحميل الإعدادات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        document.getElementById('settingsForm').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="color: var(--danger-color); font-size: 40px; margin-bottom: 15px;"></i>
                <h4 style="color: var(--primary-color);">حدث خطأ في تحميل الإعدادات</h4>
                <button class="btn-primary" onclick="loadAdminSettings()" 
                        style="padding: 10px 20px; background: var(--secondary-color); color: white; border: none; border-radius: 8px; margin-top: 10px; font-family: 'Cairo';">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// تحميل إدارة الألوان
async function loadThemeSettings() {
    try {
        console.log('🎨 جاري تحميل إعدادات الألوان...');
        
        const themeRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        const themeDoc = await window.firebaseModules.getDoc(themeRef);
        
        let colors = {};
        if (themeDoc.exists()) {
            colors = themeDoc.data();
            console.log('🎨 الألوان المحملة:', colors);
        } else {
            // ألوان افتراضية
            colors = {
                primaryColor: '#1C1C1C',
                secondaryColor: '#C9A24D',
                successColor: '#27ae60',
                dangerColor: '#e74c3c',
                warningColor: '#f39c12',
                lightColor: '#F7F5F2',
                updatedAt: window.firebaseModules.serverTimestamp()
            };
        }
        
        // تعبئة الحقول
        document.getElementById('primaryColor').value = colors.primaryColor || '#1C1C1C';
        document.getElementById('primaryColorHex').value = colors.primaryColor || '#1C1C1C';
        document.getElementById('secondaryColor').value = colors.secondaryColor || '#C9A24D';
        document.getElementById('secondaryColorHex').value = colors.secondaryColor || '#C9A24D';
        document.getElementById('successColor').value = colors.successColor || '#27ae60';
        document.getElementById('successColorHex').value = colors.successColor || '#27ae60';
        document.getElementById('dangerColor').value = colors.dangerColor || '#e74c3c';
        document.getElementById('dangerColorHex').value = colors.dangerColor || '#e74c3c';
        document.getElementById('warningColor').value = colors.warningColor || '#f39c12';
        document.getElementById('warningColorHex').value = colors.warningColor || '#f39c12';
        document.getElementById('lightColor').value = colors.lightColor || '#F7F5F2';
        document.getElementById('lightColorHex').value = colors.lightColor || '#F7F5F2';
        
        // إضافة الأحداث
        setupColorInputEvents();
        
        console.log('✅ تم تحميل إعدادات الألوان');
        
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات الألوان:', error);
    }
}

// إعداد أحداث حقول الألوان
function setupColorInputEvents() {
    // المزامنة بين input color و input text
    const colorInputs = [
        'primaryColor', 'secondaryColor', 'successColor', 
        'dangerColor', 'warningColor', 'lightColor'
    ];
    
    colorInputs.forEach(inputId => {
        const colorInput = document.getElementById(inputId);
        const hexInput = document.getElementById(inputId + 'Hex');
        
        if (colorInput && hexInput) {
            colorInput.addEventListener('input', function() {
                hexInput.value = this.value;
                updateColorPreview(inputId, this.value);
            });
            
            hexInput.addEventListener('input', function() {
                const value = this.value.trim();
                if (value.match(/^#[0-9A-F]{6}$/i)) {
                    colorInput.value = value;
                    updateColorPreview(inputId, value);
                }
            });
            
            hexInput.addEventListener('change', function() {
                const value = this.value.trim();
                if (!value.startsWith('#')) {
                    this.value = '#' + value;
                }
                if (value.match(/^#[0-9A-F]{6}$/i)) {
                    colorInput.value = this.value;
                    updateColorPreview(inputId, this.value);
                }
            });
        }
    });
    
    // حدث حفظ الألوان
    document.getElementById('saveColorsBtn').addEventListener('click', saveThemeColors);
    
    // حدث استعادة الألوان الافتراضية
    document.getElementById('resetColorsBtn').addEventListener('click', resetThemeColors);
}

// تحديث معاينة الألوان
function updateColorPreview(colorId, value) {
    const previewElement = document.querySelector(`.preview-${colorId.replace('Color', '')}`);
    if (previewElement) {
        previewElement.style.backgroundColor = value;
        
        // إذا كان لون الخلفية فاتح جداً، اجعل النص داكن
        if (colorId === 'lightColor') {
            const rgb = hexToRgb(value);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            previewElement.style.color = brightness > 125 ? 'var(--dark-color)' : 'white';
        }
    }
}

// تحويل HEX إلى RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// حفظ الألوان
async function saveThemeColors() {
    try {
        console.log('💾 جاري حفظ الألوان...');
        
        const colors = {
            primaryColor: document.getElementById('primaryColorHex').value.trim(),
            secondaryColor: document.getElementById('secondaryColorHex').value.trim(),
            successColor: document.getElementById('successColorHex').value.trim(),
            dangerColor: document.getElementById('dangerColorHex').value.trim(),
            warningColor: document.getElementById('warningColorHex').value.trim(),
            lightColor: document.getElementById('lightColorHex').value.trim(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        // التحقق من صحة الألوان
        const colorRegex = /^#[0-9A-F]{6}$/i;
        for (const [key, value] of Object.entries(colors)) {
            if (!colorRegex.test(value) && key !== 'updatedAt') {
                showToast(`اللون ${key} غير صالح (يجب أن يكون بتنسيق #RRGGBB)`, 'error');
                return;
            }
        }
        
        const themeRef = window.firebaseModules.doc(adminDb, "settings", "theme_colors");
        await window.firebaseModules.setDoc(themeRef, colors, { merge: true });
        
        showToast('تم حفظ الألوان بنجاح', 'success');
        console.log('✅ تم حفظ الألوان:', colors);
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الألوان:', error);
        showToast('حدث خطأ في حفظ الألوان: ' + error.message, 'error');
    }
}

// استعادة الألوان الافتراضية
async function resetThemeColors() {
    if (!confirm('هل تريد استعادة الألوان الافتراضية؟')) return;
    
    try {
        const defaultColors = {
            primaryColor: '#1C1C1C',
            secondaryColor: '#C9A24D',
            successColor: '#27ae60',
            dangerColor: '#e74c3c',
            warningColor: '#f39c12',
            lightColor: '#F7F5F2'
        };
        
        document.getElementById('primaryColor').value = defaultColors.primaryColor;
        document.getElementById('primaryColorHex').value = defaultColors.primaryColor;
        document.getElementById('secondaryColor').value = defaultColors.secondaryColor;
        document.getElementById('secondaryColorHex').value = defaultColors.secondaryColor;
        document.getElementById('successColor').value = defaultColors.successColor;
        document.getElementById('successColorHex').value = defaultColors.successColor;
        document.getElementById('dangerColor').value = defaultColors.dangerColor;
        document.getElementById('dangerColorHex').value = defaultColors.dangerColor;
        document.getElementById('warningColor').value = defaultColors.warningColor;
        document.getElementById('warningColorHex').value = defaultColors.warningColor;
        document.getElementById('lightColor').value = defaultColors.lightColor;
        document.getElementById('lightColorHex').value = defaultColors.lightColor;
        
        // تحديث المعاينات
        for (const [key, value] of Object.entries(defaultColors)) {
            updateColorPreview(key, value);
        }
        
        showToast('تم استعادة الألوان الافتراضية', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في استعادة الألوان:', error);
        showToast('حدث خطأ في استعادة الألوان', 'error');
    }
}

// حفظ الإعدادات
async function saveSiteSettings() {
    try {
        console.log('💾 جاري حفظ الإعدادات...');
        
        const settings = {
            storeName: document.getElementById('storeName').value.trim(),
            logoUrl: document.getElementById('logoUrl').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            shippingCost: parseFloat(document.getElementById('shippingCost').value) || 15,
            freeShippingLimit: parseFloat(document.getElementById('freeShippingLimit').value) || 200,
            workingHours: document.getElementById('workingHours').value.trim(),
            aboutUs: document.getElementById('aboutUs').value.trim(),
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        // التحقق من الحقول المطلوبة
        if (!settings.storeName || !settings.email || !settings.phone) {
            showToast('الرجاء ملء الحقول المطلوبة', 'warning');
            return;
        }
        
        const configRef = window.firebaseModules.doc(adminDb, "settings", "site_config");
        await window.firebaseModules.setDoc(configRef, settings, { merge: true });
        
        // تحديث الشعار في لوحة التحكم فوراً
        if (settings.logoUrl) {
            const sidebarLogo = document.getElementById('adminSidebarLogo');
            if (sidebarLogo) sidebarLogo.src = settings.logoUrl;
        }

        showToast('تم حفظ الإعدادات بنجاح', 'success');
        console.log('✅ تم حفظ الإعدادات:', settings);
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        showToast('حدث خطأ في حفظ الإعدادات: ' + error.message, 'error');
    }
}

// إدارة المنتجات
function openAddProductModal() {
    currentEditingProductId = null;
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    clearProductForm();
    document.getElementById('productModal').classList.add('active');
}

async function editProduct(productId) {
    currentEditingProductId = productId;
    document.getElementById('productModalTitle').textContent = 'تعديل المنتج';
    
    try {
        const productRef = window.firebaseModules.doc(adminDb, "products", productId);
        const productDoc = await window.firebaseModules.getDoc(productRef);
        
        if (productDoc.exists()) {
            const product = productDoc.data();
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productPrice').value = product.price || 0;
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productImage').value = product.image || '';
            document.getElementById('productIsNew').checked = product.isNew || false;
            document.getElementById('productIsSale').checked = product.isSale || false;
            document.getElementById('productIsBest').checked = product.isBest || false;
            document.getElementById('productIsActive').checked = product.isActive !== false;
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل المنتج:', error);
        showToast('حدث خطأ في تحميل بيانات المنتج', 'error');
    }
    
    document.getElementById('productModal').classList.add('active');
}

function clearProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productIsNew').checked = false;
    document.getElementById('productIsSale').checked = false;
    document.getElementById('productIsBest').checked = false;
    document.getElementById('productIsActive').checked = true;
}

async function saveProduct() {
    try {
        const productData = {
            name: document.getElementById('productName').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            category: document.getElementById('productCategory').value,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            description: document.getElementById('productDescription').value.trim(),
            image: document.getElementById('productImage').value.trim(),
            isNew: document.getElementById('productIsNew').checked,
            isSale: document.getElementById('productIsSale').checked,
            isBest: document.getElementById('productIsBest').checked,
            isActive: document.getElementById('productIsActive').checked,
            updatedAt: window.firebaseModules.serverTimestamp()
        };
        
        // التحقق من البيانات
        if (!productData.name || !productData.price || !productData.category || !productData.image) {
            showToast('الرجاء ملء جميع الحقول المطلوبة', 'warning');
            return;
        }
        
        if (currentEditingProductId) {
            // تحديث
            const productRef = window.firebaseModules.doc(adminDb, "products", currentEditingProductId);
            await window.firebaseModules.updateDoc(productRef, productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            // إضافة
            productData.createdAt = window.firebaseModules.serverTimestamp();
            const productsRef = window.firebaseModules.collection(adminDb, "products");
            await window.firebaseModules.addDoc(productsRef, productData);
            showToast('تم إضافة المنتج بنجاح', 'success');
        }
        
        closeModal();
        await loadAdminProducts();
        await loadAdminStats();
        
    } catch (error) {
        console.error('❌ خطأ في حفظ المنتج:', error);
        showToast('حدث خطأ في حفظ المنتج: ' + error.message, 'error');
    }
}

function confirmDeleteProduct(productId) {
    productToDelete = productId;
    document.getElementById('confirmTitle').textContent = 'هل أنت متأكد؟';
    document.getElementById('confirmMessage').textContent = 'سيتم تعطيل المنتج وعدم عرضه في المتجر.';
    document.getElementById('confirmModal').classList.add('active');
}

async function deleteProductConfirmed() {
    if (!productToDelete) return;
    
    try {
        const productRef = window.firebaseModules.doc(adminDb, "products", productToDelete);
        await window.firebaseModules.updateDoc(productRef, {
            isActive: false,
            updatedAt: window.firebaseModules.serverTimestamp()
        });
        
        showToast('تم تعطيل المنتج بنجاح', 'success');
        closeModal();
        
        await loadAdminProducts();
        await loadAdminStats();
        
        productToDelete = null;
        
    } catch (error) {
        console.error('❌ خطأ في تعطيل المنتج:', error);
        showToast('حدث خطأ في تعطيل المنتج', 'error');
    }
}

// إعداد الأحداث
function setupAdminEventListeners() {
    console.log('🔗 إعداد الأحداث...');
    
    // التبويبات
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // تحديث التبويبات
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // تحديث المحتوى
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
    
    // أزرار
    document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    
    // إغلاق النوافذ
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || 
            e.target.classList.contains('modal') ||
            (e.target.classList.contains('btn-secondary') && e.target.textContent.includes('إلغاء'))) {
            closeModal();
        }
    });
    
    // تحميل تبويب الإحصائيات تلقائياً عند بدء التشغيل
    loadAdminStats();
    
    console.log('✅ الأحداث جاهزة');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    productToDelete = null;
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        border-right: 5px solid ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--secondary-color)'};
    `;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--secondary-color)'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initAdminApp);

// تصدير الدوال
window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.confirmDeleteProduct = confirmDeleteProduct;
window.deleteProductConfirmed = deleteProductConfirmed;
window.saveProduct = saveProduct;
window.loadAdminProducts = loadAdminProducts;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminSettings = loadAdminSettings;
window.closeModal = closeModal;
window.logoutAdmin = function() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
};
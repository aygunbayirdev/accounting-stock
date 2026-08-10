# Accounting & Stock Management — Full-Stack Temizlik & Tamamlama Planı

**Amaç:** Şu an backend'i MVP seviyesinde, frontend'i büyük ölçüde eksik olan bu projeyi; **temiz kodlu, güvenli, uçtan uca ekranları tamamlanmış, portföyde gururla sergilenebilecek bir full-stack proje** haline getirmek.

**Kaynak:** Bu plan, backend (`Accounting.Api/Domain/Application/Infrastructure/Tests`) ve frontend (`accounting-web`) üzerinde yapılan tam kapsamlı bir kod incelemesinin bulgularına dayanıyor (2026-08-10). Mevcut kurallar `backend/PROJECT_RULES.md` ve `frontend/FRONTEND_RULES.md` dosyalarında tanımlı — bu plan o kuralları **değiştirmiyor**, onlara uyumu sağlıyor ve ihlal edilen yerleri düzeltiyor.

**Genel değerlendirme:** Backend'in mimari iskeleti (Clean Architecture + CQRS/MediatR + FluentValidation + JWT + audit trail + optimistic concurrency) sağlam — bu bir **yeniden yazım değil, disiplinli bir refactor + eksik parça tamamlama** işi. Frontend'de servis/model/interceptor/guard katmanı (18 servis, 20 model, auth altyapısı) beklenenden çok daha ileride; asıl eksik olan **ekranlar**. Yani önümüzdeki iş büyük ölçüde "var olan sağlam kalıpları tekrar tekrar uygulamak" — sıfırdan altyapı kurmak değil.

**Önerilen sıralama:** Önce backend'deki güvenlik/doğruluk açıklarını kapat (küçük ama kritik), sonra backend'i temizle, sonra frontend'i sistematik olarak inşa et (önce temel varlıklar — Cari/Şube/Depo — çünkü diğer ekranlar bunlara bağımlı), en son cilalama + test + deploy.

---

## Faz 0 — Kritik Güvenlik & Doğruluk Düzeltmeleri (Backend) ✅ TAMAMLANDI (2026-08-10)

Bunlar portföyde sergilemeden önce **mutlaka** kapatılması gereken, küçük ama gerçek açıklar.

- [x] `appsettings.json`'daki hardcoded zayıf JWT secret'ı kaldırıldı; `Program.cs` artık config'de secret yoksa/32 karakterden kısaysa startup'ta `InvalidOperationException` fırlatıyor. Lokal geliştirme için `dotnet user-secrets` kuruldu, `backend/README.md` güncellendi.
- [x] `GetStockByIdHandler` ve `GetStockMovementByIdHandler`'a `.ApplyBranchFilter()` eklendi (IDOR kapatıldı).
- [x] `UserConfiguration` ve `RoleConfiguration`'a `ApplySoftDelete()` eklendi; `Users.Email` unique index'i `HasFilter("[IsDeleted] = 0")` ile filtrelendi (migration: `AddUserRoleSoftDeleteFilters`). Not: `RolePermission`/`UserRole` saf junction entity — `ISoftDeletable` implemente etmiyorlar, bu yüzden onlara filter eklenmedi (ilk denetimin bu ikisi için önerisi yanlıştı, entity'ler incelenince düzeltildi).
- [x] `AuthController.Register` tamamen kaldırıldı (backend: controller/command/handler/validator; frontend: `/register` route, sayfası, `AuthService.register()`, login sayfasındaki link, interceptor whitelist girdisi). Karar: bu tek şirketli bir ERP, herkese açık self-registration yerine kullanıcılar `POST /api/users` (admin-only, şube+rol atamalı) ile oluşturuluyor — bu akış zaten mevcuttu ve register'dan daha güvenliydi.
- [x] `Program.cs`'deki migration+seed bloğu ayrıştırıldı: migration hâlâ koşulsuz çalışıyor (şema için gerekli), seed artık `Seeding:Enabled` config anahtarıyla korunuyor (varsayılan `true`, docker-compose'u bozmaz).
- [x] (Plan dışı, denetim sırasında bulundu) `backend/.dockerignore` ve `frontend/.dockerignore` eklendi — bunlar olmadan lokal `dotnet build`/`npm install` sonrası `docker compose build` host'un Windows'a özgü `obj/`/`node_modules` klasörlerini container'a kopyalayıp restore'u kırıyordu.
- [x] Doğrulama: `dotnet build` (0 hata), `dotnet test` (Faz 0 sonunda 75/75 yeşil), `npx tsc --noEmit` (frontend, 0 hata), `docker compose up -d --build sqlserver backend` + gerçek smoke test (health 200, seeded admin ile login 200, `/api/auth/register` artık 404, `docker compose build frontend` başarılı).
- [ ] **Commit edilmedi** — kullanıcı döndüğünde `git status`/`git diff` ile gözden geçirip onaylaması bekleniyor.

## Faz 1 — Backend Mimari Temizliği & Tutarlılık (kısmen tamamlandı, 2026-08-10)

Küçük/orta ölçekli maddeler ve (canlı testte ortaya çıkan) iki kritik bug otomatik pilotta tamamlandı ve doğrulandı (`dotnet build` 0 hata, `dotnet test` 75/75 yeşil, `docker compose` ile gerçek API smoke testi). Stok tutarlılığı sorunu başlangıçta "büyük mimari karar" diye ertelenmişti, ama N+1 düzeltmesini canlıda test ederken gerçek/üretimi bloke eden bir bug olduğu kanıtlandığı için ertelenmeden düzeltildi. Kalan büyük yüzeyli maddeler (API contract katmanı, ExceptionHandler geçişi, tam route taraması, hata mesajı dili) hâlâ **bilinçli olarak ertelendi**.

- [x] Ölü kod silindi: `GetInvoicesQueryHandler_EXAMPLE.cs`, `InvoiceCalculator.cs`, `CreateInvoiceRequest.cs`/`CreateInvoiceResponse.cs`, `IAppDbContext.QueryRaw`/`AppDbContext.QueryRaw`, `UnitTest1.cs`, `Permissions.cs`'deki `ExpenseList`/`ExpenseDefinition`/`FixedAsset` grupları + `DataSeeder.cs`'deki bunlara referans veren rol-izin atamaları.
- [x] **Fatura toplam hesaplaması birleştirildi**: yeni `Accounting.Application/Services/InvoiceLineCalculator.cs`, hem `CreateInvoiceHandler` hem `UpdateInvoiceHandler` artık bunu kullanıyor. Bu arada gerçek bir tutarsızlık bulundu ve düzeltildi: `UpdateInvoiceHandler.ProcessLine` satır tutarını `RoundQuantity` (3 hane) ile yuvarlıyordu, `CreateInvoiceHandler` ise `RoundAmount` (2 hane) kullanıyordu — aynı fatura önce oluşturulup sonra güncellenirse `Gross`/`Net`/`Vat` küçük farklarla kayabiliyordu. Artık ikisi de `RoundAmount` kullanıyor (PROJECT_RULES.md'nin `AmountJsonConverter` 2-hane kuralıyla tutarlı).
- [x] `TransferStockHandler`'daki kendi kendine bırakılmış "Wait, ... tutarsız mı?" yorumu incelendi: **gerçek bir tutarsızlık yoktu** — hem `TransferStockHandler` hem `CreateStockMovementHandler` zaten `StockMovement.Quantity`'yi pozitif büyüklük olarak saklıyor, yön `Type` ile belirleniyor. Kafa karıştıran yorum, kararı netleştiren bir yorumla değiştirildi.
- [x] `BranchesController`'ın block-scoped namespace'i diğer 17 controller gibi file-scoped'a çevrildi.
- [x] JWT settings'in çift bağlanması giderildi: `Program.cs`'deki `AddSingleton(Options.Create(jwtSettings))` kaldırıldı; DI'daki tek gerçek kaynak artık `Infrastructure/DependencyInjection.cs`'deki `services.Configure<JwtSettings>(...)`. `Program.cs`'deki yerel `jwtSettings` değişkeni sadece `JwtBearerOptions` kurulumu için kullanılıyor (açıklayıcı yorum eklendi).
- [x] CORS origin'leri `Cors:AllowedOrigins` config bölümünden okunuyor (`Cors__AllowedOrigins__0` env var ile prod origin eklenebilir), config yoksa mevcut localhost:3000/4200 varsayılanına düşüyor — geriye dönük uyumlu.
- [x] **`ApproveOrderHandler` N+1 düzeltildi**: satır başına `ValidateStockAvailabilityAsync` yerine tek sorgulu `ValidateBatchStockAvailabilityAsync` kullanılıyor. `OrderTests.cs`'e gerçek bir `Verify()` eklendi (eskiden loose mock sayesinde hiçbir şeyi doğrulamadan geçiyordu).
- [x] **`CreateInvoiceHandler` stok hareketi N+1 düzeltildi**: satır başına iç içe `_mediator.Send(CreateStockMovementCommand)` (N ayrı dispatch + N ayrı SaveChanges) kaldırıldı; artık tüm satırlar için tek sorgu ile mevcut `Stock` satırları çekiliyor, hesaplama bellekte yapılıyor, tek `SaveChangesAsync` ile kaydediliyor. Ortak "stok yönü + negatife düşme kontrolü" mantığı yeni `StockQuantityCalculator`'a çıkarıldı, hem burada hem `CreateStockMovementHandler`'da kullanılıyor (kopya kod/kayma riski önlendi). Artık kullanılmayan `IMediator` bağımlılığı `CreateInvoiceHandler`'dan kaldırıldı.
- [x] **Stok tutarlılığı sorunu çözüldü** (önceden "büyük mimari karar, ertelendi" olarak işaretliydi — N+1 düzeltmesini canlıda docker-compose ile test ederken **gerçek, üretimi bloke eden bir bug olduğu kanıtlandı**, bu yüzden ertelenmeden düzeltildi): `StockService.GetStockStatusAsync` artık müsaitliği `Stock` tablosundaki fiziksel bakiyeden (branch-scoped, `ApplyBranchFilter` ile) hesaplıyor, eskisi gibi fatura/sipariş satırlarını yeniden toplamıyor. `QuantityIn`/`QuantityOut` bilgilendirme amaçlı fatura-türetilmiş toplamlar olarak kaldı (raporlarda kullanılıyor), ama `QuantityAvailable` (tüm satış/onay validasyonlarının dayandığı tek alan) artık gerçek stoktan hesaplanıyor. **Canlıda kanıtlanan gerçek etki**: seed verisindeki "Açılış stoku" gibi doğrudan stok hareketiyle girilen miktarlar eski hesaplamada hiç sayılmıyordu — gerçek stok 62 iken sistem "-4 mevcut" diyip her satışı reddediyordu. `StockServiceTests.cs`'e bunu kanıtlayan bir regresyon testi eklendi (`ValidateStockAvailability_ShouldSucceed_ForStockWithNoPurchaseInvoice`).
- [x] **(Plan dışı, bu sırada bulunan ayrı bir kritik bug)** `CreateInvoiceValidator`/`UpdateInvoiceValidator`'daki `AllItemsBelongToSameBranchAsync`, Item'ların global (branch-agnostic) yapıldığı migration'dan sonra ters mantıkla kalmıştı: `!mismatchedItems` aslında "bu ID'lerden herhangi biri DB'de var mı" sorusuna bakıyordu ve varsa validasyonu **başarısız** kılıyordu — yani gerçek bir ürünle fatura oluşturmak/güncellemek her zaman 400 dönüyordu. `AllItemsExistAsync`'e çevrildi (gerçek varlık kontrolü yapıyor, olmayan/silinmiş ID'lerde anlamlı hata veriyor). Docker-compose üzerinden gerçek bir Purchase + Sales faturası uçtan uca oluşturularak doğrulandı.
- [ ] **API contract (Request/Response DTO) katmanı (ERTELENDİ)**: 18 controller'ın tamamını kapsayan, public API şeklini değiştiren geniş yüzeyli bir değişiklik — tek oturumda mekanik yapılırsa gözden kaçan bir kırılma riski yüksek.
- [ ] **`ExceptionToProblemDetailsMiddleware` → yerleşik `IExceptionHandler` (ERTELENDİ)**: Hata response şeklini (ProblemDetails alanları) etkileyebilecek bir değişiklik, frontend'in `http-problem-interceptor.ts`'i buna göre yazıldığı için birlikte test edilmeden yapılmamalı.
- [ ] Route pattern / `{id:int}` constraint / RowVersion body-vs-query tutarsızlıklarının tam taranması (ERTELENDİ — 18 controller'ı tek tek gözden geçirmek gerekiyor, BranchesController'daki namespace dışında dokunulmadı).
- [ ] Hata mesajı dili tutarlılığı (Türkçe/İngilizce karışık) (ERTELENDİ — büyük string-literal taraması gerektiriyor, ayrı bir oturumda yapılmalı).

## Faz 2 — Backend Test Kapsamının Genişletilmesi (kısmen tamamlandı, 2026-08-10)

- [x] `Accounting.Tests` projesine `Microsoft.AspNetCore.Mvc.Testing` + `Accounting.Api` referansı eklendi. `Integration/CustomWebApplicationFactory.cs`: gerçek `Program`'ı (`Testing` ortamında) ayağa kaldırıyor, `AppDbContext`'i EF Core InMemory ile değiştiriyor, migration+seed'i atlıyor (`Program.cs`'e `!app.Environment.IsEnvironment("Testing")` guard'ı eklendi — InMemory provider `MigrateAsync` desteklemiyor). `WebApplicationFactory<Program>` çalışabilsin diye `Program.cs`'in sonuna `public partial class Program {}` eklendi (top-level statement'ların örtük ürettiği sınıfı dışarıdan erişilebilir yapıyor). JWT secret gibi ayarlar `Environment.SetEnvironmentVariable` ile veriliyor (config-injection zamanlaması `builder.Build()` öncesi okunan değerlere yetişmiyor, ortam değişkenleri senkron okunduğu için güvenilir tek yol bu oldu).
- [x] İlk entegrasyon testleri yazıldı (`Integration/AuthEndpointsIntegrationTests.cs`, `Integration/BranchIsolationIntegrationTests.cs`): gerçek login akışı, `register` 404, yanlış şifre, token'sız 401 — ve **Faz 0'da düzeltilen iki branch-isolation açığı için gerçek HTTP seviyesinde regresyon testi**: başka şubenin stok/stok hareketi kaydına gerçek bir JWT ile 404 döndüğü doğrulanıyor (önceki unit testler bunu hiç test etmiyordu, çünkü handler'ları doğrudan çağırıyorlardı — branch filter'ın asıl riski HTTP+auth katmanında).
- [ ] `ExceptionToProblemDetailsMiddleware`'in 6 dalını kapsayan entegrasyon testleri (ERTELENDİ — daha fazla controller/senaryo gerektiriyor, sonraki bir oturuma bırakıldı).
- [x] ~~`AuthController.Register`'ın yetkilendirme/rol atama davranışını test et~~ — madde geçersizleşti, Faz 0'da endpoint tamamen kaldırıldı; kaldırıldığını doğrulayan `Register_Endpoint_ShouldNotExist` testi eklendi.
- [x] Stok tutarlılığı düzeltmesi (Faz 1) için: manuel/açılış stok düzeltmesi sonrası `StockService`'in doğru müsaitlik döndürdüğünü doğrulayan test eklendi (`StockServiceTests.ValidateStockAvailability_ShouldSucceed_ForStockWithNoPurchaseInvoice`) — canlıda bulunan gerçek bug'ı kanıtlıyor.
- [x] ~~`GetStockByIdHandler`/`GetStockMovementByIdHandler`'daki branch-isolation düzeltmesi için özel bir regresyon testi yok~~ — `BranchIsolationIntegrationTests`'te eklendi (bkz. yukarı).
- [ ] Kalan controller'lar için daha fazla entegrasyon testi (payment/cheque akışları uçtan uca) — genişletilebilir, şimdilik altyapı + en kritik birkaçı kuruldu.

## Canlı Test Turu — Diğer Ana Akışlar (2026-08-10)

Faz 0/1/2 sonrası, aynı yöntemle (docker-compose + gerçek `curl` istekleri) sipariş, ödeme ve çek akışları da uçtan uca denendi. **İki kritik bug daha bulundu ve düzeltildi** — ikisi de yine `dotnet test`'in hiç yakalamadığı, sadece gerçek isteklerle ortaya çıkan türden:

- [x] **Sipariş numarası çakışması (üretimi bloke ediyordu)**: `CreateOrderHandler`, aynı şube+tür için "son siparişi" bulurken tüm `OrderNumber` string'lerini büyükten küçüğe sıralayıp en büyüğünü sayıya çevirmeye çalışıyordu. `DataSeeder` siparişleri `"SO-2026-0001"`/`"PO-2026-0001"` formatında seed ediyor; bu format hem string sıralamada `"000001"`'den önce gelir (harf > rakam) hem de sayıya çevrilemez — sonuç: numara üretici her seferinde sessizce 1'e sıfırlanıyordu. Aynı şube+tür için **ikinci gerçek sipariş her zaman** `IX_Orders_...OrderNumber` unique index'ine çarpıp 500 dönüyordu. Düzeltme: numara üretimi artık `InvoiceNumberService`'teki gibi kendi prefix'ine göre (`StartsWith`) filtreleyip sıralıyor, format seed verisiyle aynı aileye (`SO-2026-0001` tarzı) çekildi. Regresyon testi: `OrderTests.CreateOrder_TwiceForSameBranchAndType_ShouldNotReuseOrderNumber`.
- [x] **Sipariş→fatura dönüşümünde yanlış tutarlar + eksik negatif-stok koruması**: `CreateInvoiceFromOrderHandler`, satır `Gross` alanına (dokümante edilmiş anlamı: "Qty × Fiyat, iskonto öncesi") yanlışlıkla `Net + KDV` yazıyordu, `GrandTotal` hiç set edilmiyordu (0 kalıyordu), ve fatura başlığındaki `TotalLineGross` da hiç hesaplanmıyordu (0 kalıyordu — canlıda `"totalLineGross":"0.00"` olarak görüldü). Ayrıca stok güncellemesi elle yazılmıştı, `StockQuantityCalculator`'ın negatif-stok korumasından geçmiyordu, ve sadece `ItemId` doluluğuna bakıyordu — `ItemType.Inventory` kontrolü yoktu (Hizmet/Masraf/Demirbaş kalemleri için de yanlışlıkla stok hareketi oluşturuyordu). Düzeltme: satır hesaplaması `InvoiceLineCalculator`'a, stok güncellemesi `StockQuantityCalculator`'a yönlendirildi, Inventory-tipi filtresi eklendi. Regresyon testi: `OrderToInvoiceConversionTests.CreateInvoiceFromOrder_ShouldProduceCorrectLineAndHeaderTotals` (daha önce bu handler'ı test eden **hiçbir** test yoktu).
- [x] Doğrulama: `dotnet build` (0 hata), `dotnet test` (83/83), ve docker-compose üzerinde gerçek uçtan uca akış: sipariş oluştur → onayla → faturaya çevir (doğru `totalLineGross` ile) → ödeme al (fatura bakiyesi 0'a düştü, kasa bakiyesi arttı) → çek oluştur → dashboard/gelir-gider raporları hatasız döndü. İki ardışık sipariş artık çakışmadan oluşuyor.
- [x] **Ürün (Item) oluşturma/güncelleme her zaman 400 dönüyordu** (cari/depo/kategori oluşturma turu sırasında bulundu): `CreateItemCommand`/`UpdateItemCommand`'daki `Type` alanı `ItemType` yerine düz `int` olarak tanımlanmıştı (PROJECT_RULES.md'nin kendi "Command/Query DTO'larında native enum kullan" kuralının ihlali — `CreateInvoiceCommand.Type` doğru şekilde `InvoiceType` kullanıyor, Item'lar istisnaydı), validator'lar ise `RuleFor(x => x.Type).IsInEnum()` çağırıyordu. `IsInEnum()` bir `int` üzerinde çalıştırılınca (gerçek bir enum tipi değil) her zaman geçersiz sonuç veriyor — yani **hangi değer gönderilirse gönderilsin** `POST`/`PUT /api/items` validasyonu başarısız oluyordu. Seed'deki 19 ürün DataSeeder tarafından bu API'yi hiç kullanmadan direkt eklendiği için sorun fark edilmemişti. Düzeltme: her iki command'da `Type` gerçek `ItemType` enum'una çevrildi, handler'lardaki gereksiz `(ItemType)` cast'leri kaldırıldı, validator'lardaki `(int)ItemType.FixedAsset` karşılaştırmaları `ItemType.FixedAsset`'e sadeleştirildi. Regresyon testi: `Integration/ItemEndpointsIntegrationTests.CreateItem_WithValidInventoryType_ShouldReturn200` (gerçek HTTP+validator zincirinden geçen ilk test — handler-seviyeli eski testler bu bug'ı hiç görmüyordu).
- [x] Doğrulama: `dotnet build` (0 hata), `dotnet test` (84/84), docker-compose üzerinde gerçek `POST /api/items` isteğiyle 201 doğrulandı. Cari (Contact), Depo (Warehouse), Kategori (Category) oluşturma akışları ayrıca denendi, sorun bulunmadı.

## Faz 3 — Frontend: Bug Düzeltmeleri & Altyapı Temizliği

Yeni ekran yazmadan önce mevcut kodun sağlam bir temel olduğundan emin ol.

- [ ] **Gerçek bug**: `invoice-edit.page.ts`'deki `(InvoiceFormComponent as any).prototype.id = this.id` satırını kaldır; `id`'yi `@Input()` olarak normal şekilde component'e geçir. Bu, class prototype'ını mutasyona uğratıyor ve component instance'ları arasında state sızdırabilir.
- [ ] Bozuk `app.spec.ts`'i düzelt (olmayan `./app`/`App`'i import ediyor, gerçek kök component `AppComponent`) — ya sil ya da gerçek component'e göre yeniden yaz.
- [ ] `core/utils/money.utils.ts` (iyi tasarlanmış, dokümante edilmiş ama hiç kullanılmayan modül) ile `invoices-form.component.ts` içindeki elle yazılmış `preview()` metodunun aynı hesaplamayı tekrarlamasını çöz — `invoices-form` gerçek `money.utils.ts` fonksiyonlarını kullansın, kopya silinsin.
- [ ] `adminGuard`'ı (`core/guards/auth.guard.ts`) gerçekten route'lara bağla, ya da Faz 8'deki permission-tabanlı guard'la değiştir.
- [ ] `src/styles.scss`'deki çift `@include mat.theme(...)` çağrısını tek, temiz bir tema tanımına indir.
- [ ] AG Grid tema kullanımını tekilleştir: `invoices-form.component.ts`'deki `ag-theme-quartz` CSS class'ı yerine paylaşılan `AG_THEME` objesini (`core/ag-grid/ag-theme.ts`) kullan (FRONTEND_RULES.md §"AG Grid Standardı" ile tutarlı hale getir).
- [ ] Fragile route-mode tespitini (`invoice-edit.page.ts:33`, URL'in `/edit` ile bitip bitmediğine bakarak view/edit modu belirleme) route `data` üzerinden açık bir mod bilgisiyle değiştir.
- [ ] `login-page.component.ts`/`register-page.component.ts`'deki neredeyse birebir kopya inline stilleri paylaşılan bir "auth layout" component/SCSS partial'ına çıkar.
- [ ] Hardcoded Türkçe UI string'lerini (hata mesajları, snackbar metinleri gibi tekrar edenleri) tek bir mesaj sabitleri dosyasında topla — tam i18n gerekmez, ama tekrarı ve tutarsızlığı önle.

## Faz 4 — Frontend: Temel Varlık Ekranları (diğer ekranların önkoşulu)

Fatura/sipariş formları şu an cari/şube ID'sini elle yazdırıyor — bu üç modül olmadan diğer ekranlar da tam olgunlaşamaz.

- [ ] **Cariler (Contacts)** — liste + oluştur/düzenle/sil ekranı. Bu, invoice/order formlarındaki çıplak `contactId` sayı input'unun yerini alacak bir arama/autocomplete bileşeninin de önkoşulu.
- [ ] **Şubeler (Branches)** — liste + oluştur/düzenle/sil ekranı (şu an sadece invoice listesinde dropdown olarak tüketiliyor, kendi yönetim ekranı yok).
- [ ] **Depolar (Warehouses)** — liste + oluştur/düzenle/sil ekranı.
- [ ] Paylaşılan bir **"entity picker" bileşeni** (autocomplete + arama, `ContactsService`/`BranchesService`/`ItemsService` ile parametrik çalışan) yaz — invoice formundaki çıplak ID input'larını bununla değiştireceğiz (Faz 5).

## Faz 5 — Frontend: Mevcut Ekranların Tamamlanması

- [ ] **Fatura formu**: `branchId`/`contactId` çıplak ID input'larını Faz 4'teki entity picker ile değiştir; eksik alanları ekle (`discountRate`, `discountAmount`, `withholdingRate`, `expenseDefinitionId`, `waybillNumber`, `waybillDateUtc`, `paymentDueDateUtc` — bunlar zaten `invoice.models.ts`'de tanımlı, backend command'ları destekliyor, sadece UI'da yok); satır grid'ine gerekli validasyonları ekle (zorunlu `itemId`, min/max `vatRate` vs.).
- [ ] **Stok kartları (Items)**: oluştur/düzenle/sil ekranını tamamla (şu an sadece liste var, servis katmanı zaten hazır).
- [ ] **Sabit kıymetler (Fixed Assets)**: oluştur/düzenle/sil ekranını tamamla; devre dışı bırakılmış sıralamayı (`fixed-assets-page.component.ts:71-73`) düzelt.
- [ ] **Tahsilat/Ödeme (Payments)**: oluştur/düzenle/sil ekranını tamamla (servis zaten tam CRUD destekliyor, sadece liste ekranı var).

## Faz 6 — Frontend: Kalan Modüller (sıfırdan ekran)

Servis/model katmanı zaten hazır olan, hiç UI'ı olmayan alanlar. Faz 4/5'teki kalıpları (list-grid, form, entity picker) tekrar kullanarak inşa et.

- [ ] **Siparişler (Orders)**: liste + oluştur/düzenle + onayla/iptal et + faturaya dönüştür akışı.
- [ ] **Stok hareketleri (Stock Movements)**: liste (salt okunur ledger görünümü) + manuel hareket girişi.
- [ ] **Stok durumu (Stocks)**: depo/şube bazlı güncel stok seviyeleri listesi.
- [ ] **Kasa/Banka hesapları (Cash & Bank Accounts)**: liste + oluştur/düzenle/sil.
- [ ] **Çek/Senet (Cheques)**: liste + al/ver/tahsil et/ciro et akışları (backend `Receive`/`Issue`/`Cash`/`Endorse` command'larını kapsayacak şekilde).
- [ ] **Kategoriler (Categories)**: liste + oluştur/düzenle/sil (not: backend'de service dosyası eksik görünüyor — önce backend `CategoriesService` frontend eşleniğini yaz, sonra ekranı).
- [ ] **Firma ayarları (Company Settings)**: tekil kayıt düzenleme formu.
- [ ] **Kullanıcı yönetimi (Users)**: liste + oluştur/düzenle/sil + şifre değiştirme (admin-only).
- [ ] **Rol yönetimi (Roles)**: liste + oluştur/düzenle/sil + permission ataması.

## Faz 7 — Dashboard & Raporlama UI

- [ ] Ana sayfa/dashboard ekranı (root route artık `/invoices`'a değil `/dashboard`'a yönlensin) — backend'deki `GET /api/reports/dashboard` endpoint'ini kullanan özet kartlar (günlük satış, kasa durumu, alacaklar vb.).
- [ ] Cari ekstre ekranı (`GET /api/reports/contact/{id}/statement`).
- [ ] Stok durumu raporu ekranı + Excel export (backend zaten `stock-status/export` sağlıyor).
- [ ] Gelir/gider raporu ekranı (`income-expense` endpoint'i).

## Faz 8 — Rol/Yetki Bazlı UI, Tutarlılık, Cilalama

- [ ] Backend'in `permission` claim listesine göre çalışan bir permission-check servis/directive'i yaz (`hasPermission('Invoice.Create')` gibi); menüdeki her linki ve her oluştur/düzenle/sil butonunu buna göre koşullu göster.
- [ ] Sidenav menüsünü role/permission'a göre filtrele (şu an her authenticated kullanıcıya aynı 4 link gösteriliyor).
- [ ] Silme işlemleri için tutarlı bir onay dialog'u (MatDialog) pattern'i kur, tüm liste ekranlarına uygula.
- [ ] Boş durum (empty state) ve hata durumu gösterimlerini tüm liste ekranlarında tutarlı hale getir.
- [ ] Tüm yeni ekranların `FRONTEND_RULES.md`'deki money/tarih/route/naming kurallarına uyduğunu gözden geçir.

## Faz 9 — Test, CI, Deploy

- [ ] Kritik akışlar için gerçek Angular unit/component testleri yaz (auth flow, invoice form hesaplama mantığı, guard'lar) — şu an tek spec dosyası bozuk ve gerçek kapsam sıfır.
- [ ] Backend + frontend için GitHub Actions CI pipeline'ı kur (build + test her push/PR'da) — ECommercePlatform projesindeki `.github/workflows/ci.yml` deseniyle tutarlı.
- [ ] `docker-compose.yml`'i gözden geçir: Faz 0'daki seed/migration guard'ını yansıt, backend Dockerfile'a non-root user + healthcheck ekle.
- [ ] Projeyi bir sunucuya canlıya al (ECommercePlatform/WMS'teki gibi kendi subdomain'i ile), portföydeki proje kartına canlı demo linki ekle.
- [ ] Son bir uçtan uca manuel tur: login → cari oluştur → stok kartı oluştur → sipariş oluştur → onayla → faturaya çevir → tahsilat işle → dashboard'da rakamların doğru yansıdığını doğrula.

---

## İlerlemeyi nasıl kullanmalı

Bu liste kabaca öncelik sırasına göredir ama katı değildir — Faz 0 kesinlikle önce gelmeli (güvenlik), Faz 4 Faz 5/6'dan önce gelmeli (bağımlılık), gerisi paralel ilerlenebilir. Her fazı bitirdikçe ilgili kutucukları işaretle; büyük/çok parçalı maddeler tamamlandıkça alt görevlere bölünebilir.

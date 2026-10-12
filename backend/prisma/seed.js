"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var text_normalizer_util_1 = require("../src/modules/products/utils/text-normalizer.util");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var neighborhoodsData, _i, neighborhoodsData_1, n, categoriesData, categoryMap, _a, categoriesData_1, cat, upserted, productsData, _b, productsData_1, prod, categoryId, normName, existing, productId, created, _c, _d, aliasText, normAlias;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('🌱 Starting Mohalla Signal database seeding...');
                    neighborhoodsData = [
                        {
                            name: 'Indiranagar',
                            slug: 'indiranagar',
                            city: 'Bengaluru',
                            pincode: '560038',
                        },
                        {
                            name: 'Koramangala',
                            slug: 'koramangala',
                            city: 'Bengaluru',
                            pincode: '560034',
                        },
                        {
                            name: 'Connaught Place',
                            slug: 'connaught-place',
                            city: 'New Delhi',
                            pincode: '110001',
                        },
                        {
                            name: 'Sector 15 Gurgaon',
                            slug: 'sector-15-gurgaon',
                            city: 'Gurugram',
                            pincode: '122001',
                        },
                    ];
                    _i = 0, neighborhoodsData_1 = neighborhoodsData;
                    _e.label = 1;
                case 1:
                    if (!(_i < neighborhoodsData_1.length)) return [3 /*break*/, 4];
                    n = neighborhoodsData_1[_i];
                    return [4 /*yield*/, prisma.neighborhood.upsert({
                            where: { slug: n.slug },
                            create: {
                                name: n.name,
                                slug: n.slug,
                                city: n.city,
                                pincode: n.pincode,
                            },
                            update: {
                                name: n.name,
                                city: n.city,
                                pincode: n.pincode,
                            },
                        })];
                case 2:
                    _e.sent();
                    console.log("  \u2713 Neighborhood: ".concat(n.name, " (").concat(n.city, " - PIN: ").concat(n.pincode, ")"));
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    categoriesData = [
                        {
                            name: 'Flours & Grains',
                            slug: 'flours-grains',
                            description: 'Staple, specialty, and gluten-free flours, millets, and grains',
                        },
                        {
                            name: 'Dairy & Plant Beverages',
                            slug: 'dairy-beverages',
                            description: 'Dairy essentials and plant-based alternative beverages',
                        },
                        {
                            name: 'Spices & Seasonings',
                            slug: 'spices-seasonings',
                            description: 'Authentic Indian whole and powdered spices',
                        },
                        {
                            name: 'Staples & Pulses',
                            slug: 'staples-pulses',
                            description: 'Essential pulses, lentils, rice, and cooking ingredients',
                        },
                    ];
                    categoryMap = new Map();
                    _a = 0, categoriesData_1 = categoriesData;
                    _e.label = 5;
                case 5:
                    if (!(_a < categoriesData_1.length)) return [3 /*break*/, 8];
                    cat = categoriesData_1[_a];
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { slug: cat.slug },
                            create: {
                                name: cat.name,
                                slug: cat.slug,
                                description: cat.description,
                            },
                            update: {
                                name: cat.name,
                                description: cat.description,
                            },
                        })];
                case 6:
                    upserted = _e.sent();
                    categoryMap.set(cat.slug, upserted.id);
                    console.log("  \u2713 Category: ".concat(cat.name));
                    _e.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    productsData = [
                        {
                            name: 'Ragi Flour',
                            categorySlug: 'flours-grains',
                            description: 'Nutrient-dense organic finger millet flour (Mandua / Nachni atta)',
                            aliases: [
                                'ragi atta',
                                'finger millet flour',
                                'nachni flour',
                                'mandua atta',
                                'nachni atta',
                                'ragi flour',
                                'mandwa flour',
                            ],
                        },
                        {
                            name: 'Rice Flour',
                            categorySlug: 'flours-grains',
                            description: 'Fine stone-ground white rice flour for culinary batters and doughs',
                            aliases: [
                                'chawal ka atta',
                                'arisi maavu',
                                'rice atta',
                                'rice powder',
                                'chawal atta',
                                'biyyam pindi',
                            ],
                        },
                        {
                            name: 'Wheat Flour',
                            categorySlug: 'flours-grains',
                            description: 'Stone-ground 100% whole wheat chakki atta',
                            aliases: [
                                'gehu ka atta',
                                'whole wheat atta',
                                'chakki atta',
                                'atta flour',
                                'gehu atta',
                                'sharbati atta',
                            ],
                        },
                        {
                            name: 'Gram Flour (Besan)',
                            categorySlug: 'flours-grains',
                            description: 'Pure roasted chana dal gram flour / besan',
                            aliases: [
                                'besan',
                                'chana atta',
                                'chickpea flour',
                                'gram flour',
                                'kadala maavu',
                                'senaga pindi',
                            ],
                        },
                        {
                            name: 'Almond Milk',
                            categorySlug: 'dairy-beverages',
                            description: 'Unsweetened plant-based almond milk beverage',
                            aliases: [
                                'badam milk',
                                'almond beverage',
                                'almond drink',
                                'almond plant milk',
                                'dairy free almond milk',
                            ],
                        },
                        {
                            name: 'Oat Milk',
                            categorySlug: 'dairy-beverages',
                            description: 'Creamy barista-grade plant-based oat beverage',
                            aliases: [
                                'oats milk',
                                'oat beverage',
                                'oat drink',
                                'plant based oat milk',
                            ],
                        },
                        {
                            name: 'Turmeric Powder',
                            categorySlug: 'spices-seasonings',
                            description: 'High-curcumin organic pure turmeric powder (Haldi)',
                            aliases: [
                                'haldi',
                                'haldi powder',
                                'turmeric',
                                'manjal powder',
                                'pasupu',
                            ],
                        },
                    ];
                    _b = 0, productsData_1 = productsData;
                    _e.label = 9;
                case 9:
                    if (!(_b < productsData_1.length)) return [3 /*break*/, 20];
                    prod = productsData_1[_b];
                    categoryId = categoryMap.get(prod.categorySlug);
                    if (!categoryId)
                        return [3 /*break*/, 19];
                    normName = (0, text_normalizer_util_1.normalizeText)(prod.name);
                    return [4 /*yield*/, prisma.product.findFirst({
                            where: {
                                normalizedName: normName,
                                categoryId: categoryId,
                            },
                        })];
                case 10:
                    existing = _e.sent();
                    productId = void 0;
                    if (!existing) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.product.update({
                            where: { id: existing.id },
                            data: {
                                name: prod.name,
                                description: prod.description,
                                isActive: true,
                            },
                        })];
                case 11:
                    _e.sent();
                    productId = existing.id;
                    return [3 /*break*/, 14];
                case 12: return [4 /*yield*/, prisma.product.create({
                        data: {
                            name: prod.name,
                            normalizedName: normName,
                            description: prod.description,
                            categoryId: categoryId,
                            isActive: true,
                        },
                    })];
                case 13:
                    created = _e.sent();
                    productId = created.id;
                    _e.label = 14;
                case 14:
                    _c = 0, _d = prod.aliases;
                    _e.label = 15;
                case 15:
                    if (!(_c < _d.length)) return [3 /*break*/, 18];
                    aliasText = _d[_c];
                    normAlias = (0, text_normalizer_util_1.normalizeText)(aliasText);
                    if (!normAlias)
                        return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.productAlias.upsert({
                            where: {
                                productId_normalizedAlias: {
                                    productId: productId,
                                    normalizedAlias: normAlias,
                                },
                            },
                            create: {
                                alias: aliasText,
                                normalizedAlias: normAlias,
                                productId: productId,
                            },
                            update: {
                                alias: aliasText,
                            },
                        })];
                case 16:
                    _e.sent();
                    _e.label = 17;
                case 17:
                    _c++;
                    return [3 /*break*/, 15];
                case 18:
                    console.log("  \u2713 Product: ".concat(prod.name, " (").concat(prod.aliases.length, " aliases seeded)"));
                    _e.label = 19;
                case 19:
                    _b++;
                    return [3 /*break*/, 9];
                case 20:
                    console.log('✅ Mohalla Signal database seeding completed successfully.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });

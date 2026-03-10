// 专题应用演示
// WebGeoDB 教程 - 5个完整的行业应用场景

class ProjectsDemo {
    constructor() {
        this.currentProject = 'geo-fencing';
        this.maps = {};
        this.layers = {};

        this.init();
    }

    // 初始化
    init() {
        this.initNavigation();
        this.initAllProjects();
    }

    // 初始化导航
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const project = e.currentTarget.dataset.project;
                this.switchProject(project);
            });
        });
    }

    // 切换项目
    switchProject(project) {
        this.currentProject = project;

        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-project="${project}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.project-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${project}-demo`).classList.add('active');

        // 重新调整地图大小
        setTimeout(() => {
            if (this.maps[project]) {
                this.maps[project].invalidateSize();
            }
        }, 100);
    }

    // 初始化所有项目
    initAllProjects() {
        this.initGeoFencingDemo();
        this.initEnvironmentalDemo();
        this.initLogisticsDemo();
        this.initSmartCityDemo();
        this.initSocialDemo();
    }

    // ==================== 地理围栏演示 ====================
    initGeoFencingDemo() {
        const map = L.map('geo-fencing-map').setView([39.9042, 116.4074], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 创建示例围栏
        const fences = [
            {
                name: 'CBD核心商圈',
                type: 'delivery',
                coords: [
                    [39.9100, 116.4500],
                    [39.9100, 116.4800],
                    [39.8900, 116.4800],
                    [39.8900, 116.4500],
                    [39.9100, 116.4500]
                ],
                color: '#4285f4'
            },
            {
                name: '三里屯促销区',
                type: 'promotion',
                coords: [
                    [39.9350, 116.4500],
                    [39.9350, 116.4700],
                    [39.9250, 116.4700],
                    [39.9250, 116.4500],
                    [39.9350, 116.4500]
                ],
                color: '#34a853'
            },
            {
                name: '机场限制区',
                type: 'restriction',
                coords: [
                    [40.0800, 116.5800],
                    [40.0800, 116.6200],
                    [40.0600, 116.6200],
                    [40.0600, 116.5800],
                    [40.0800, 116.5800]
                ],
                color: '#fbbc04'
            }
        ];

        fences.forEach(fence => {
            const polygon = L.polygon(fence.coords, {
                color: fence.color,
                fillColor: fence.color,
                fillOpacity: 0.2,
                weight: 3
            }).addTo(map);

            polygon.bindPopup(`<b>${fence.name}</b><br>类型: ${fence.type}`);
        });

        // 添加中心标记
        L.marker([39.9042, 116.4074])
            .addTo(map)
            .bindPopup('<b>北京中心</b><br>地理围栏演示')
            .openPopup();

        this.maps['geo-fencing'] = map;
    }

    // ==================== 环境监测演示 ====================
    initEnvironmentalDemo() {
        const map = L.map('environmental-map').setView([39.9042, 116.4074], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 创建监测站点
        const stations = [
            { name: '朝阳区站点', lat: 39.9219, lng: 116.4437, aqi: 45 },
            { name: '海淀区站点', lat: 39.9590, lng: 116.2985, aqi: 78 },
            { name: '丰台区站点', lat: 39.8583, lng: 116.2870, aqi: 156 },
            { name: '东城区站点', lat: 39.9289, lng: 116.4203, aqi: 52 },
            { name: '西城区站点', lat: 39.9137, lng: 116.3668, aqi: 68 }
        ];

        stations.forEach(station => {
            const color = station.aqi <= 50 ? '#34a853' :
                         station.aqi <= 100 ? '#fbbc04' : '#ea4335';

            const circle = L.circleMarker([station.lat, station.lng], {
                radius: 15,
                fillColor: color,
                color: color,
                weight: 3,
                fillOpacity: 0.7
            }).addTo(map);

            circle.bindPopup(`<b>${station.name}</b><br>AQI: ${station.aqi}<br>状态: ${station.aqi <= 50 ? '优' : station.aqi <= 100 ? '良' : '差'}`);
        });

        this.maps['environmental'] = map;
    }

    // ==================== 物流配送演示 ====================
    initLogisticsDemo() {
        const map = L.map('logistics-map').setView([39.9042, 116.4074], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 仓库位置
        const warehouse = L.marker([39.9042, 116.4074], {
            icon: L.divIcon({
                className: 'warehouse-icon',
                html: '📦',
                iconSize: [30, 30]
            })
        }).addTo(map);
        warehouse.bindPopup('<b>中心仓库</b><br>物流配送中心');

        // 配送点
        const deliveryPoints = [
            { name: '配送点1', lat: 39.9219, lng: 116.4437 },
            { name: '配送点2', lat: 39.9590, lng: 116.2985 },
            { name: '配送点3', lat: 39.8583, lng: 116.2870 },
            { name: '配送点4', lat: 39.9289, lng: 116.4203 }
        ];

        deliveryPoints.forEach(point => {
            const marker = L.marker([point.lat, point.lng], {
                icon: L.divIcon({
                    className: 'delivery-icon',
                    html: '📍',
                    iconSize: [25, 25]
                })
            }).addTo(map);
            marker.bindPopup(`<b>${point.name}</b>`);
        });

        // 配送路线
        const routeCoords = [
            [39.9042, 116.4074],
            [39.9219, 116.4437],
            [39.9590, 116.2985],
            [39.8583, 116.2870],
            [39.9289, 116.4203]
        ];

        const route = L.polyline(routeCoords, {
            color: '#ea4335',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map);

        // 添加动画效果
        let dashOffset = 0;
        setInterval(() => {
            dashOffset -= 1;
            route.setStyle({ dashOffset: dashOffset });
        }, 100);

        this.maps['logistics'] = map;
    }

    // ==================== 智慧城市演示 ====================
    initSmartCityDemo() {
        const map = L.map('smart-city-map').setView([39.9042, 116.4074], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 道路网络
        const roads = [
            { name: '长安街', coords: [[39.9076, 116.3972], [39.9076, 116.4074]] },
            { name: '东三环', coords: [[39.9042, 116.4500], [39.9042, 116.4700]] },
            { name: '西二环', coords: [[39.9042, 116.3500], [39.9042, 116.3700]] }
        ];

        roads.forEach(road => {
            const line = L.polyline(road.coords, {
                color: '#4285f4',
                weight: 5,
                opacity: 0.8
            }).addTo(map);
            line.bindPopup(`<b>${road.name}</b>`);
        });

        // 公共设施
        const facilities = [
            { name: '医院', lat: 39.9219, lng: 116.4437, type: 'hospital' },
            { name: '学校', lat: 39.9590, lng: 116.2985, type: 'school' },
            { name: '公园', lat: 39.8583, lng: 116.2870, type: 'park' }
        ];

        facilities.forEach(facility => {
            const icon = facility.type === 'hospital' ? '🏥' :
                        facility.type === 'school' ? '🏫' : '🌳';

            const marker = L.marker([facility.lat, facility.lng], {
                icon: L.divIcon({
                    className: 'facility-icon',
                    html: icon,
                    iconSize: [30, 30]
                })
            }).addTo(map);
            marker.bindPopup(`<b>${facility.name}</b>`);
        });

        // 维护区域
        const maintenanceZone = L.polygon([
            [39.9200, 116.4500],
            [39.9200, 116.4700],
            [39.9100, 116.4700],
            [39.9100, 116.4500]
        ], {
            color: '#ea4335',
            fillColor: '#ea4335',
            fillOpacity: 0.3,
            weight: 3
        }).addTo(map);

        maintenanceZone.bindPopup('<b>维护区域</b><br>正在施工中');

        this.maps['smart-city'] = map;
    }

    // ==================== 社交位置演示 ====================
    initSocialDemo() {
        const map = L.map('social-map').setView([39.9042, 116.4074], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 用户位置
        const users = [
            { name: '小明', lat: 39.9350, lng: 116.4550, activity: '在三里屯发现一家很棒的咖啡店' },
            { name: '小红', lat: 39.9219, lng: 116.4437, activity: '朝阳公园跑步打卡' },
            { name: '小刚', lat: 39.9590, lng: 116.2985, activity: '在海淀区工作' },
            { name: '小李', lat: 39.8583, lng: 116.2870, activity: '丰台区逛街中' }
        ];

        users.forEach(user => {
            const marker = L.circleMarker([user.lat, user.lng], {
                radius: 12,
                fillColor: '#ea4335',
                color: '#ea4335',
                weight: 3,
                fillOpacity: 0.8
            }).addTo(map);

            marker.bindPopup(`<b>${user.name}</b><br>${user.activity}`);
        });

        // 热点地点
        const hotspots = [
            { name: '三里屯', lat: 39.9350, lng: 116.4550, radius: 800 },
            { name: '朝阳公园', lat: 39.9219, lng: 116.4437, radius: 600 },
            { name: '国贸', lat: 39.9087, lng: 116.4550, radius: 1000 }
        ];

        hotspots.forEach(spot => {
            const circle = L.circle([spot.lat, spot.lng], {
                radius: spot.radius,
                fillColor: '#fbbc04',
                color: '#fbbc04',
                weight: 2,
                fillOpacity: 0.3
            }).addTo(map);

            circle.bindPopup(`<b>${spot.name}</b><br>热点地点`);
        });

        // 活动范围
        const activityZone = L.polygon([
            [39.9400, 116.4400],
            [39.9400, 116.4700],
            [39.9200, 116.4700],
            [39.9200, 116.4400]
        ], {
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.2,
            weight: 3,
            dashArray: '5, 10'
        }).addTo(map);

        activityZone.bindPopup('<b>活动范围</b><br>用户活动区域');

        this.maps['social'] = map;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ProjectsDemo();
});

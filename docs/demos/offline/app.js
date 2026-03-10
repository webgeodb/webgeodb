// 离线地图与位置追踪演示
// WebGeoDB 教程第4章

class OfflineTrackingDemo {
    constructor() {
        this.currentDemo = 'offline';
        this.maps = {};
        this.layers = {};
        this.trackData = [];
        this.workoutData = {
            startTime: null,
            elapsedTime: 0,
            distance: 0,
            waypoints: [],
            isTracking: false
        };
        this.trackingInterval = null;
        this.workoutInterval = null;

        this.init();
    }

    // 初始化
    init() {
        this.initNavigation();
        this.initOfflineDemo();
        this.initTrackingDemo();
        this.initFitnessDemo();
        this.initAllMaps();
    }

    // 初始化导航
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const demo = e.target.dataset.demo;
                this.switchDemo(demo);
            });
        });
    }

    // 切换演示
    switchDemo(demo) {
        this.currentDemo = demo;

        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-demo="${demo}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.demo-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${demo}-demo`).classList.add('active');

        // 重新调整地图大小
        setTimeout(() => {
            if (this.maps[demo]) {
                this.maps[demo].invalidateSize();
            }
        }, 100);
    }

    // 初始化所有地图
    initAllMaps() {
        this.initOfflineMap();
        this.initTrackingMap();
        this.initFitnessMap();
    }

    // ==================== 离线地图演示 ====================
    initOfflineDemo() {
        document.getElementById('download-tiles').addEventListener('click', () => {
            this.downloadTiles();
        });

        document.getElementById('clear-cache').addEventListener('click', () => {
            this.clearCache();
        });

        document.getElementById('toggle-offline').addEventListener('click', () => {
            this.toggleOffline();
        });

        // 监听在线状态
        window.addEventListener('online', () => {
            this.updateOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateOnlineStatus(false);
        });

        this.updateOnlineStatus(navigator.onLine);
    }

    initOfflineMap() {
        const map = L.map('offline-map').setView([39.9042, 116.4074], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 添加示例标记
        const marker = L.marker([39.9042, 116.4074]).addTo(map);
        marker.bindPopup('<b>北京天安门</b><br>离线地图演示位置').openPopup();

        this.maps.offline = map;
    }

    updateOnlineStatus(isOnline) {
        const statusDot = document.getElementById('offline-status');
        const statusText = document.getElementById('offline-text');

        if (isOnline) {
            statusDot.classList.remove('offline');
            statusText.textContent = '在线';
            this.showToast('已连接到网络', 'success');
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = '离线';
            this.showToast('网络连接已断开', 'info');
        }
    }

    async downloadTiles() {
        this.showToast('开始下载地图瓦片...', 'info');

        // 模拟下载过程
        setTimeout(() => {
            const size = (Math.random() * 10 + 5).toFixed(1);
            document.getElementById('cache-size').textContent = `${size} MB`;
            this.showToast(`地图下载完成！已缓存 ${size} MB`, 'success');
        }, 2000);
    }

    clearCache() {
        if (confirm('确定要清除所有缓存吗？')) {
            document.getElementById('cache-size').textContent = '0 MB';
            this.showToast('缓存已清除', 'success');
        }
    }

    toggleOffline() {
        this.showToast('离线模式已启用（演示）', 'info');
    }

    // ==================== 位置追踪演示 ====================
    initTrackingDemo() {
        document.getElementById('start-tracking').addEventListener('click', () => {
            this.startTracking();
        });

        document.getElementById('stop-tracking').addEventListener('click', () => {
            this.stopTracking();
        });

        document.getElementById('clear-track').addEventListener('click', () => {
            this.clearTrack();
        });
    }

    initTrackingMap() {
        const map = L.map('tracking-map').setView([39.9042, 116.4074], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 创建图层
        this.layers.track = L.polyline([], {
            color: '#4285f4',
            weight: 4,
            opacity: 0.8
        }).addTo(map);

        this.layers.currentPosition = L.marker([39.9042, 116.4074]).addTo(map);

        this.maps.tracking = map;
    }

    startTracking() {
        if (!navigator.geolocation) {
            this.showToast('您的浏览器不支持地理位置功能', 'error');
            return;
        }

        this.trackData = [];
        this.layers.track.setLatLngs([]);

        this.showToast('开始追踪位置...', 'info');

        // 模拟位置追踪（因为在演示环境中可能无法获取真实GPS）
        this.simulateTracking();

        document.getElementById('start-tracking').disabled = true;
        document.getElementById('stop-tracking').disabled = false;
    }

    simulateTracking() {
        let lat = 39.9042;
        let lng = 116.4074;
        let time = 0;
        let distance = 0;

        this.trackingInterval = setInterval(() => {
            // 模拟移动
            lat += (Math.random() - 0.5) * 0.001;
            lng += (Math.random() - 0.5) * 0.001;

            const position = { lat, lng, time: Date.now() };
            this.trackData.push(position);

            // 更新地图
            this.layers.track.addLatLng([lat, lng]);
            this.layers.currentPosition.setLatLng([lat, lng]);
            this.maps.tracking.setView([lat, lng], 16);

            // 计算距离
            if (this.trackData.length > 1) {
                const from = turf.point([this.trackData[this.trackData.length - 2].lng, this.trackData[this.trackData.length - 2].lat]);
                const to = turf.point([lng, lat]);
                distance += turf.distance(from, to, { units: 'kilometers' });
            }

            // 更新统计
            time++;
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            const seconds = time % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            document.getElementById('tracking-time').textContent = timeStr;
            document.getElementById('tracking-distance').textContent = distance.toFixed(2) + ' km';
            document.getElementById('total-distance').textContent = distance.toFixed(2) + ' km';
            document.getElementById('tracking-points').textContent = this.trackData.length;

            const speed = time > 0 ? (distance / (time / 3600)) : 0;
            document.getElementById('tracking-speed').textContent = speed.toFixed(1) + ' km/h';

            document.getElementById('current-location').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        }, 1000);
    }

    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        document.getElementById('start-tracking').disabled = false;
        document.getElementById('stop-tracking').disabled = true;
        this.showToast('追踪已停止', 'success');
    }

    clearTrack() {
        this.stopTracking();
        this.trackData = [];
        this.layers.track.setLatLngs([]);
        this.maps.tracking.setView([39.9042, 116.4074], 15);

        document.getElementById('tracking-time').textContent = '00:00:00';
        document.getElementById('tracking-distance').textContent = '0.00 km';
        document.getElementById('total-distance').textContent = '0.00 km';
        document.getElementById('tracking-speed').textContent = '0.0 km/h';
        document.getElementById('tracking-points').textContent = '0';
        document.getElementById('current-location').textContent = '未获取';

        this.showToast('轨迹已清除', 'success');
    }

    // ==================== 运动追踪演示 ====================
    initFitnessDemo() {
        document.getElementById('start-workout').addEventListener('click', () => {
            this.startWorkout();
        });

        document.getElementById('stop-workout').addEventListener('click', () => {
            this.stopWorkout();
        });

        document.getElementById('add-waypoint').addEventListener('click', () => {
            this.addWaypoint();
        });
    }

    initFitnessMap() {
        const map = L.map('fitness-map').setView([39.9042, 116.4074], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 创建图层
        this.layers.workoutTrack = L.polyline([], {
            color: '#ea4335',
            weight: 4,
            opacity: 0.8
        }).addTo(map);

        this.layers.waypoints = L.layerGroup().addTo(map);

        this.maps.fitness = map;
    }

    startWorkout() {
        this.workoutData = {
            startTime: Date.now(),
            elapsedTime: 0,
            distance: 0,
            waypoints: [],
            isTracking: true
        };

        this.trackData = [];
        this.layers.workoutTrack.setLatLngs([]);
        this.layers.waypoints.clearLayers();

        this.showToast('运动开始！', 'success');

        // 模拟运动追踪
        this.simulateWorkout();

        document.getElementById('start-workout').disabled = true;
        document.getElementById('stop-workout').disabled = false;
    }

    simulateWorkout() {
        let lat = 39.9042;
        let lng = 116.4074;
        const activityType = document.getElementById('activity-type').value;

        this.workoutInterval = setInterval(() => {
            // 模拟移动
            const speed = activityType === 'running' ? 0.0008 :
                         activityType === 'cycling' ? 0.0015 :
                         activityType === 'walking' ? 0.0005 : 0.0006;

            lat += (Math.random() - 0.5) * speed;
            lng += (Math.random() - 0.5) * speed;

            const position = { lat, lng, time: Date.now() };
            this.trackData.push(position);

            // 更新地图
            this.layers.workoutTrack.addLatLng([lat, lng]);
            this.maps.fitness.setView([lat, lng], 16);

            // 计算距离
            if (this.trackData.length > 1) {
                const from = turf.point([this.trackData[this.trackData.length - 2].lng, this.trackData[this.trackData.length - 2].lat]);
                const to = turf.point([lng, lat]);
                this.workoutData.distance += turf.distance(from, to, { units: 'kilometers' });
            }

            // 更新时间
            this.workoutData.elapsedTime = Math.floor((Date.now() - this.workoutData.startTime) / 1000);

            this.updateWorkoutStats();

        }, 2000);
    }

    updateWorkoutStats() {
        const { elapsedTime, distance } = this.workoutData;

        // 时间
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = elapsedTime % 60;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        document.getElementById('workout-time').textContent = timeStr;
        document.getElementById('workout-distance').textContent = distance.toFixed(2);

        // 卡路里（简化计算）
        const calories = Math.floor(distance * 65);
        document.getElementById('calories').textContent = calories;

        // 配速
        if (elapsedTime > 0 && distance > 0) {
            const paceMinutes = Math.floor(elapsedTime / 60 / distance);
            const paceSeconds = Math.floor((elapsedTime / distance) % 60);
            const paceStr = `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"`;
            document.getElementById('avg-pace').textContent = paceStr;
        }
    }

    stopWorkout() {
        if (this.workoutInterval) {
            clearInterval(this.workoutInterval);
            this.workoutInterval = null;
        }

        this.workoutData.isTracking = false;

        document.getElementById('start-workout').disabled = false;
        document.getElementById('stop-workout').disabled = true;

        const { distance, elapsedTime } = this.workoutData;
        this.showToast(`运动结束！距离: ${distance.toFixed(2)} km, 时长: ${Math.floor(elapsedTime / 60)} 分钟`, 'success');
    }

    addWaypoint() {
        if (!this.workoutData.isTracking) {
            this.showToast('请先开始运动', 'error');
            return;
        }

        const lastPoint = this.trackData[this.trackData.length - 1];
        if (!lastPoint) return;

        const waypointNum = this.workoutData.waypoints.length + 1;
        const waypoint = {
            name: `航点 ${waypointNum}`,
            lat: lastPoint.lat,
            lng: lastPoint.lng,
            time: new Date().toLocaleTimeString()
        };

        this.workoutData.waypoints.push(waypoint);

        // 添加到地图
        const marker = L.marker([lastPoint.lat, lastPoint.lng])
            .bindPopup(`<b>${waypoint.name}</b><br>${waypoint.time}`)
            .addTo(this.layers.waypoints);

        // 更新列表
        this.updateWaypointList();

        this.showToast(`已添加 ${waypoint.name}`, 'success');
    }

    updateWaypointList() {
        const container = document.getElementById('waypoints');
        container.innerHTML = this.workoutData.waypoints.map(wp => `
            <div class="waypoint-item">
                <div class="waypoint-info">
                    <div class="waypoint-name">${wp.name}</div>
                    <div class="waypoint-coords">${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}</div>
                </div>
                <div class="waypoint-time">${wp.time}</div>
            </div>
        `).join('');
    }

    // ==================== 工具方法 ====================
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new OfflineTrackingDemo();
});

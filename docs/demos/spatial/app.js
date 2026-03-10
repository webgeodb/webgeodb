// 空间谓词可视化演示
// WebGeoDB 教程第2章

class SpatialPredicateDemo {
    constructor() {
        this.map = null;
        this.objectALayer = null;
        this.objectBLayer = null;
        this.intersectionLayer = null;
        this.currentPredicate = 'intersects';
        this.isAnimating = false;
        this.animationFrame = null;

        // 定义8个OGC空间谓词
        this.predicates = {
            intersects: {
                name: 'Intersects (相交)',
                description: '判断两个几何体是否相交或接触。这是最常用的空间谓词，返回true当两个几何体共享任何部分空间。',
                test: (geomA, geomB) => turf.booleanIntersects(geomA, geomB)
            },
            contains: {
                name: 'Contains (包含)',
                description: '判断几何体A是否完全包含几何体B。B的所有点都必须在A内部，且B的内部至少有一个点在A的内部。',
                test: (geomA, geomB) => turf.booleanContains(geomA, geomB)
            },
            within: {
                name: 'Within (在内部)',
                description: '判断几何体A是否完全在几何体B的内部。这是Contains的反向操作。',
                test: (geomA, geomB) => turf.booleanWithin(geomA, geomB)
            },
            touches: {
                name: 'Touches (相接)',
                description: '判断两个几何体是否相接但不相交。它们只在边界上接触，内部不相交。',
                test: (geomA, geomB) => turf.booleanTouches(geomA, geomB)
            },
            crosses: {
                name: 'Crosses (交叉)',
                description: '判断两个几何体是否交叉。适用于线与线、线与面、面与线的组合，表示它们以某种方式交叉。',
                test: (geomA, geomB) => turf.booleanCrosses(geomA, geomB)
            },
            overlaps: {
                name: 'Overlaps (重叠)',
                description: '判断两个几何体是否重叠。它们必须有相同的维度，且交集必须与两个几何体都具有相同的维度。',
                test: (geomA, geomB) => turf.booleanOverlap(geomA, geomB)
            },
            disjoint: {
                name: 'Disjoint (分离)',
                description: '判断两个几何体是否完全分离，没有任何共同点。这是Intersects的反向操作。',
                test: (geomA, geomB) => turf.booleanDisjoint(geomA, geomB)
            },
            equals: {
                name: 'Equals (相等)',
                description: '判断两个几何体是否在几何上相等。它们必须有相同的维度、相同的边界和内部。',
                test: (geomA, geomB) => {
                    const coordsA = JSON.stringify(geomA.geometry.coordinates);
                    const coordsB = JSON.stringify(geomB.geometry.coordinates);
                    return coordsA === coordsB;
                }
            }
        };

        // 初始化地图和事件监听
        this.initMap();
        this.initEventListeners();
        this.generateRandomGeometries();
    }

    // 初始化地图
    initMap() {
        // 创建地图，中心设置为北京
        this.map = L.map('map').setView([39.9042, 116.4074], 13);

        // 添加OpenStreetMap瓦片图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // 创建图层组
        this.objectALayer = L.layerGroup().addTo(this.map);
        this.objectBLayer = L.layerGroup().addTo(this.map);
        this.intersectionLayer = L.layerGroup().addTo(this.map);
    }

    // 初始化事件监听器
    initEventListeners() {
        // 谓词选择按钮
        document.querySelectorAll('.predicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const predicate = e.currentTarget.dataset.predicate;
                this.selectPredicate(predicate);
            });
        });

        // 控制按钮
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetMap();
        });

        document.getElementById('random-btn').addEventListener('click', () => {
            this.generateRandomGeometries();
        });

        document.getElementById('animate-btn').addEventListener('click', () => {
            this.toggleAnimation();
        });
    }

    // 选择谓词
    selectPredicate(predicate) {
        this.currentPredicate = predicate;

        // 更新UI状态
        document.querySelectorAll('.predicate-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-predicate="${predicate}"]`).classList.add('active');

        // 更新信息面板
        const predicateInfo = this.predicates[predicate];
        document.getElementById('predicate-name').textContent = predicateInfo.name;
        document.getElementById('predicate-description').textContent = predicateInfo.description;

        // 更新查询结果
        this.updateQueryResult();
    }

    // 生成随机几何体
    generateRandomGeometries() {
        // 清除现有图层
        this.objectALayer.clearLayers();
        this.objectBLayer.clearLayers();
        this.intersectionLayer.clearLayers();

        // 生成中心点
        const center = [39.9042, 116.4074];

        // 随机选择几何体类型
        const geomTypes = ['polygon', 'polygon', 'line', 'point'];
        const typeA = geomTypes[Math.floor(Math.random() * geomTypes.length)];
        const typeB = geomTypes[Math.floor(Math.random() * geomTypes.length)];

        // 生成几何体A
        this.geomA = this.generateGeometry(center, typeA, 0.01);
        this.drawGeometry(this.geomA, this.objectALayer, '#4285f4', '对象A');

        // 生成几何体B（偏移一些以确保可能有相交）
        const offset = (Math.random() - 0.5) * 0.02;
        const centerB = [center[0] + offset, center[1] + offset];
        this.geomB = this.generateGeometry(centerB, typeB, 0.008);
        this.drawGeometry(this.geomB, this.objectBLayer, '#ea4335', '对象B');

        // 计算并显示相交区域
        this.showIntersection();

        // 更新查询结果
        this.updateQueryResult();

        // 调整地图视野
        const bounds = L.latLngBounds([
            ...this.geomA.geometry.coordinates[0].map(coord => [coord[1], coord[0]]),
            ...this.geomB.geometry.coordinates[0].map(coord => [coord[1], coord[0]])
        ]);
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    // 生成几何体
    generateGeometry(center, type, size) {
        const [lat, lng] = center;

        if (type === 'polygon') {
            // 生成随机多边形
            const numPoints = 4 + Math.floor(Math.random() * 4);
            const angles = Array.from({ length: numPoints }, (_, i) =>
                (i / numPoints) * Math.PI * 2 + Math.random() * 0.5
            );
            angles.sort((a, b) => a - b);

            const coordinates = angles.map(angle => {
                const radius = size * (0.5 + Math.random() * 0.5);
                return [
                    lng + Math.cos(angle) * radius,
                    lat + Math.sin(angle) * radius
                ];
            });

            // 闭合多边形
            coordinates.push(coordinates[0]);

            return turf.polygon([coordinates]);
        } else if (type === 'line') {
            // 生成随机线
            const numPoints = 3 + Math.floor(Math.random() * 3);
            const coordinates = Array.from({ length: numPoints }, () => [
                lng + (Math.random() - 0.5) * size * 2,
                lat + (Math.random() - 0.5) * size * 2
            ]);

            return turf.lineString(coordinates);
        } else {
            // 生成随机点
            return turf.point([
                lng + (Math.random() - 0.5) * size * 2,
                lat + (Math.random() - 0.5) * size * 2
            ]);
        }
    }

    // 绘制几何体
    drawGeometry(geometry, layer, color, label) {
        let layerObject;

        if (geometry.geometry.type === 'Polygon') {
            const coords = geometry.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            layerObject = L.polygon(coords, {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 3
            });
        } else if (geometry.geometry.type === 'LineString') {
            const coords = geometry.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            layerObject = L.polyline(coords, {
                color: color,
                weight: 4
            });
        } else if (geometry.geometry.type === 'Point') {
            const coords = [geometry.geometry.coordinates[1], geometry.geometry.coordinates[0]];
            layerObject = L.circleMarker(coords, {
                radius: 10,
                fillColor: color,
                color: color,
                weight: 3,
                fillOpacity: 0.7
            });
        }

        if (layerObject) {
            layerObject.bindPopup(`<b>${label}</b>`);
            layerObject.bindTooltip(label, {
                permanent: true,
                direction: 'center',
                className: 'geometry-label'
            });
            layer.addLayer(layerObject);
        }
    }

    // 显示相交区域
    showIntersection() {
        this.intersectionLayer.clearLayers();

        try {
            const intersection = turf.intersect(this.geomA, this.geomB);
            if (intersection) {
                if (intersection.geometry.type === 'Polygon') {
                    const coords = intersection.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                    L.polygon(coords, {
                        color: '#4285f4',
                        fillColor: '#4285f4',
                        fillOpacity: 0.5,
                        weight: 3,
                        dashArray: '5, 10'
                    }).addTo(this.intersectionLayer);
                } else if (intersection.geometry.type === 'LineString') {
                    const coords = intersection.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    L.polyline(coords, {
                        color: '#4285f4',
                        weight: 6,
                        dashArray: '10, 10'
                    }).addTo(this.intersectionLayer);
                } else if (intersection.geometry.type === 'Point') {
                    const coords = [intersection.geometry.coordinates[1], intersection.geometry.coordinates[0]];
                    L.circleMarker(coords, {
                        radius: 8,
                        fillColor: '#4285f4',
                        color: '#4285f4',
                        weight: 3,
                        fillOpacity: 0.8
                    }).addTo(this.intersectionLayer);
                }
            }
        } catch (error) {
            // 某些几何体组合可能无法计算相交
            console.log('无法计算相交:', error.message);
        }
    }

    // 更新查询结果
    updateQueryResult() {
        const predicateInfo = this.predicates[this.currentPredicate];
        const result = predicateInfo.test(this.geomA, this.geomB);

        const resultElement = document.getElementById('query-result');
        resultElement.textContent = result.toString();
        resultElement.className = 'result-value ' + (result ? 'true' : 'false');
    }

    // 重置地图
    resetMap() {
        this.map.setView([39.9042, 116.4074], 13);
        this.generateRandomGeometries();
    }

    // 切换动画
    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        const btn = document.getElementById('animate-btn');

        if (this.isAnimating) {
            btn.innerHTML = '<span>⏸️</span> 暂停';
            this.startAnimation();
        } else {
            btn.innerHTML = '<span>▶️</span> 动画';
            this.stopAnimation();
        }
    }

    // 开始动画
    startAnimation() {
        let angle = 0;
        const center = [39.9042, 116.4074];
        const radius = 0.015;

        this.animationFrame = setInterval(() => {
            // 移动几何体B
            const newLng = center[1] + Math.cos(angle) * radius;
            const newLat = center[0] + Math.sin(angle) * radius;

            // 更新几何体B的位置
            const offset = 0.008;
            this.geomB = this.generateGeometry([newLat, newLng], 'polygon', offset);

            // 重新绘制
            this.objectBLayer.clearLayers();
            this.drawGeometry(this.geomB, this.objectBLayer, '#ea4335', '对象B');

            // 更新相交区域和查询结果
            this.showIntersection();
            this.updateQueryResult();

            angle += 0.1;
        }, 200);
    }

    // 停止动画
    stopAnimation() {
        if (this.animationFrame) {
            clearInterval(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new SpatialPredicateDemo();
});

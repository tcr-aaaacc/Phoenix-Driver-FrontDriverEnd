"use strict";
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const class_TimerClass = require("../../class/TimerClass.js");
const config_constEnums = require("../../config/constEnums.js");
const api_order_index = require("../../api/order/index.js");
const class_RecorderManagerClass = require("../../class/RecorderManagerClass.js");
const utils_storage = require("../../utils/storage.js");
function formatPolyline(polyline) {
  const coors = polyline;
  const pl = [];
  const kr = 1e6;
  for (let i = 2; i < coors.length; i++) {
    coors[i] = Number(coors[i - 2]) + Number(coors[i]) / kr;
  }
  for (let i = 0; i < coors.length; i += 2) {
    pl.push({
      longitude: coors[i + 1],
      latitude: coors[i]
    });
  }
  return pl;
}
const useTakeCarInfoStore = common_vendor.defineStore({
  id: "app-take-car-info",
  state: () => ({
    // 存放查询司机位置的轮询定时器实例:出发位置-> 目的地
    timer: null,
    // 存放定时录音的定时器循环实例
    recordTimer: null,
    recorderManagerInstance: null,
    // 出发地
    from: {
      address: "",
      longitude: 0,
      latitude: 0
    },
    // 目的地
    to: {
      address: "",
      longitude: 0,
      latitude: 0
    },
    // 路线信息
    RouteInfo: {
      // 路线规划
      polyline: [],
      // 路线距离 方案整体距离（米）
      distance: 0,
      // 路线时间 方案估算时间（分钟）
      duration: 0,
      // 路线标记点
      markers: []
    },
    //   乘坐的车辆信息
    carInfo: {
      driverInfo: {
        wxOpenId: "",
        name: "",
        gender: "",
        avatarUrl: "",
        driverLicenseAge: 0,
        orderCount: 0,
        score: 0
      },
      // 存放查询司机位置的轮询定时器实例:司机位置->出发位置  Stores the polling timer instance for querying the driver's location: driver location -> departure location
      timer: null,
      // 出发地  Departure
      from: {
        address: "",
        longitude: 0,
        latitude: 0
      },
      // 目的地  destination
      to: {
        address: "",
        longitude: 0,
        latitude: 0
      },
      // 路线信息  Route Information
      RouteInfo: {
        // 路线规划  Route Planning
        polyline: [],
        // 路线距离 方案整体距离（米）  Route distance Overall distance of the plan (meters)
        distance: 0,
        // 路线时间 方案估算时间（分钟）  Route time Estimated time for the solution (minutes)
        duration: 0,
        // 路线标记点  Route markers
        markers: []
      }
    },
    orderCount3: 0,
    //   订单相关信息  Order related information
    orderInfo: {
      // 存放查询订单状态的轮询定时器实例  Stores the polling timer instance for querying order status
      timer: null,
      // 订单id  Order ID
      orderId: 0,
      // 订单状态  Order Status
      orderStatus: 0
    }
  }),
  actions: {
    // 设置订单id  Set order id
    setOrderId(orderId) {
      this.orderInfo.orderId = orderId;
    },
    // 设置订单状态  Set order status
    setOrderStatus(orderStatus) {
      this.orderInfo.orderStatus = orderStatus;
    },
    // 重置订单相关信息  Reset order related information
    resetOrderInfo() {
      this.stopQueryOrderStatus();
      this.orderInfo = {
        timer: null,
        orderId: 0,
        orderStatus: 0
      };
    },
    // 设置出发地  Set departure point
    setFrom(from) {
      this.from = from;
    },
    // 设置目的地  Set destination
    setTo(to) {
      this.to = to;
    },
    // 设置出发地和目的地  Set your departure and destination
    setFromAndTo(position) {
      this.from = position.from;
      this.to = position.to;
    },
    // 重置出发地  Reset departure point
    resetFrom() {
      this.from = {
        address: "",
        longitude: 0,
        latitude: 0
      };
    },
    // 重置目的地  Reset Destination
    resetTo() {
      this.to = {
        address: "",
        longitude: 0,
        latitude: 0
      };
    },
    // 重置出发地和目的地  Reset origin and destination
    resetFromAndTo() { 
      this.resetFrom();
      this.resetTo();
    },
    // 设置路线信息  Set route information
    setRouteInfo(RouteInfo) {
      this.RouteInfo = RouteInfo;
    },
    // 重置路线信息  Reset route information
    resetRouteInfo() {
      this.RouteInfo = {
        // 路线规划  Route Planning
        polyline: [],
        // 路线距离 方案整体距离（KM）  Route distance Overall distance of the plan (KM)
        distance: 0,
        // 路线时间 方案估算时间（分钟） Route time Estimated time for the solution (minutes)
        duration: 0,
        // 路线标记点  Route markers
        markers: []
      };
    },
    // 重置出发地和目的地以及路线信息  Reset departure and destination and route information
    resetFromAndToAndRouteInfo() {
      this.resetFromAndTo();
      this.resetRouteInfo();
    },
    // 路径规划 type 1:出发地->目的地 startImgUrl 2:司机位置->目的地 carImgUrl      
    // Route planning type 1: departure location->destination startImgUrl 2: driver location->destination carImgUrl
    routePlan(type = 1) {
      return __async(this, null, function* () {
        const { from, to } = this;
        const params = {
          startPointLongitude: from.longitude,
          startPointLatitude: from.latitude,
          endPointLongitude: to.longitude,
          endPointLatitude: to.latitude
        };
        const res = yield api_order_index.getExpectOrder(params);
        const route = res.data;
        const duration = route.duration;
        const distance = route.distance;
        const polyline = [
          {
            points: formatPolyline(route.polyline),
            width: 6,
            color: "#05B473",
            arrowLine: true
          }
        ];
        const markers = [
          {
            id: 1,
            latitude: to.latitude,
            longitude: to.longitude,
            width: 25,
            height: 35,
            anchor: {
              x: 0.5,
              y: 0.5
            },
            iconPath: common_assets.endImgUrl
          },
          {
            id: 2,
            latitude: from.latitude,
            longitude: from.longitude,
            width: 25,
            height: 35,
            anchor: {
              x: 0.5,
              y: 0.5
            },
            iconPath: type === 1 ? common_assets.startImgUrl : common_assets.carImgUrl
          }
        ];
        this.setRouteInfo({
          polyline,
          distance,
          duration,
          markers
        });
        console.log("this.RouteInfo", this.RouteInfo);
      });
    },
    //   设置乘坐的车辆信息  Set the vehicle information
    setCarInfo(carInfo) {
      this.carInfo = carInfo;
    },
    // 重置乘坐的车辆信息  Reset the vehicle information
    resetCarInfo() {
      this.carInfo = {
        timer: null,
        driverInfo: {
          wxOpenId: "",
          name: "",
          gender: "",
          avatarUrl: "",
          driverLicenseAge: 0,
          orderCount: 0,
          score: 0
        },
        // 出发地  Departure
        from: {
          address: "",
          longitude: 0,
          latitude: 0
        },
        // 目的地  destination
        to: {
          address: "",
          longitude: 0,
          latitude: 0
        },
        // 路线信息  Route Information
        RouteInfo: {
          // 路线规划  Route Planning
          polyline: [],
          // 路线距离 方案整体距离（米） Route distance Overall distance of the plan (meters)
          distance: 0,
          // 路线时间 方案估算时间（分钟） Route time Estimated time for the solution (minutes)
          duration: 0,
          // 路线标记点  Route markers
          markers: []
        }
      };
    },
    //   设置乘坐的车辆信息  Set the vehicle information
    setCarRouteInfo(RouteInfo) {
      this.carInfo.RouteInfo = RouteInfo;
    },
    // 设置司机信息  Set driver information
    setCarDriverInfo(driverInfo) {
      this.carInfo.driverInfo = driverInfo;
    },
    // 设置司机出发地  Set the driver's departure location
    setCarFrom(from) {
      this.carInfo.from = from;
    },
    // 设置司机目的地  Set driver destination
    setCarTo(to) {
      this.carInfo.to = to;
    },
    // 上传位置，更新当前位置 type 0:根据订单状态自动判断type为1还是2 1:司机位置->出发地  2:司机位置->目的地 不传递
    // Upload location, update current location type 0: Automatically determine whether type is 1 or 2 based on order status 1: Driver location -> departure location 2: Driver location -> destination Not passed
    updateLocation(type = 0) {
      return __async(this, null, function* () {
        if (type === 0) {
          this.orderInfo.orderStatus === config_constEnums.OrderStatus.ACCEPTED ? type = 1 : type = 2;
        }
        console.log("更新位置--------updateLocation------1:司机位置->出发地  2:司机位置->目的地", type);
        common_vendor.index.getLocation({
          type: "gcj02",
          success: (res) => {
            if (type === 1) {
              api_order_index.updateLocationCacheToStart({
                orderId: this.orderInfo.orderId,
                longitude: res.longitude,
                latitude: res.latitude
                // todo 地址位置写死：昌平区政府
                // longitude: 116.23128,
                // latitude: 40.22077
              });
              this.setCarFrom({
                address: res.address || this.from.address,
                longitude: res.longitude,
                latitude: res.latitude
                // todo 地址位置写死：昌平区政府
                // longitude: 116.23128,
                // latitude: 40.22077
              });
              this.driversPickUpPassengersRoutePlan();
            } else {
              if (this.orderInfo.orderStatus >= 5) {
                api_order_index.updateLocationCacheToEnd({
                  orderId: this.orderInfo.orderId,
                  longitude: res.longitude,
                  latitude: res.latitude
                  // todo 地址位置写死：昌平区政府
                  // longitude: 116.23128,
                  // latitude: 40.22077
                });
                this.setFrom({
                  address: res.address || this.to.address,
                  longitude: res.longitude,
                  latitude: res.latitude
                  // todo 地址位置写死：昌平区政府
                  // longitude: 116.23128,
                  // latitude: 40.22077
                });
                this.routePlan(2);
                this.orderCount3 = 0;
              } else {
                if (this.orderCount3 == 0) {
                  this.routePlan(2);
                }
                this.orderCount3++;
              }
            }
          }
        });
      });
    },
    // 查询订单状态  Check order status
    getOrderStatusHandle() {
      return __async(this, null, function* () {
        const res = yield api_order_index.getOrderStatus(this.orderInfo.orderId);
        this.setOrderStatus(res.data);
      });
    },
    // 轮询查询订单状态   Poll to check order status
    queryOrderStatus() {
      return __async(this, arguments, function* (settingCallback = {}) {
        if (this.orderInfo.timer)
          return;
        this.orderCount3 = 0;
        this.stopQueryOrderStatus();
        this.orderInfo.timer = new class_TimerClass.TimerClass({
          time: 5e3,
          callback: () => __async(this, null, function* () {
            yield this.getOrderStatusHandle();
            yield this.updateLocation();
            switch (this.orderInfo.orderStatus) {
              case config_constEnums.OrderStatus.WAITING_ACCEPT:
                console.log("OrderStatus.WAITING_ACCEPT");
                if (settingCallback.WAITING_ACCEPT) {
                  settingCallback.WAITING_ACCEPT();
                  delete settingCallback.WAITING_ACCEPT;
                }
                break;
              case config_constEnums.OrderStatus.ACCEPTED:
                console.log("OrderStatus.ACCEPTED");
                if (settingCallback.ACCEPTED) {
                  settingCallback.ACCEPTED();
                  delete settingCallback.ACCEPTED;
                }
                break;
              case config_constEnums.OrderStatus.DRIVER_ARRIVED:
                console.log("OrderStatus.DRIVER_ARRIVED");
                if (settingCallback.DRIVER_ARRIVED) {
                  settingCallback.DRIVER_ARRIVED();
                  delete settingCallback.DRIVER_ARRIVED;
                }
                break;
              case config_constEnums.OrderStatus.UPDATE_CART_INFO:
                console.log("OrderStatus.UPDATE_CART_INFO");
                if (settingCallback.UPDATE_CART_INFO) {
                  settingCallback.UPDATE_CART_INFO();
                  delete settingCallback.UPDATE_CART_INFO;
                }
                break;
              case config_constEnums.OrderStatus.START_SERVICE:
                console.log("OrderStatus.START_SERVICE", settingCallback.START_SERVICE);
                if (settingCallback.START_SERVICE) {
                  settingCallback.START_SERVICE();
                  delete settingCallback.START_SERVICE;
                }
                break;
              case config_constEnums.OrderStatus.END_SERVICE:
                console.log("OrderStatus.END_SERVICE");
                if (settingCallback.END_SERVICE) {
                  settingCallback.END_SERVICE();
                  delete settingCallback.END_SERVICE;
                }
                break;
              case config_constEnums.OrderStatus.UNPAID:
                console.log("OrderStatus.UNPAID");
                if (settingCallback.UNPAID) {
                  settingCallback.UNPAID();
                  delete settingCallback.UNPAID;
                }
                break;
              case config_constEnums.OrderStatus.PAID:
                console.log("OrderStatus.PAID");
                if (settingCallback.PAID) {
                  settingCallback.PAID();
                  delete settingCallback.PAID;
                }
                break;
              case config_constEnums.OrderStatus.CANCEL_ORDER:
                console.log("OrderStatus.CANCEL_ORDER");
                if (settingCallback.CANCEL_ORDER) {
                  settingCallback.CANCEL_ORDER();
                  delete settingCallback.CANCEL_ORDER;
                }
                break;
              default:
                console.log("default");
            }
          })
        });
        this.orderInfo.timer.start();
      });
    },
    stopQueryOrderStatus() {
      var _a;
      console.log("Stop polling order status--------stopQueryOrderStatus");
      (_a = this.orderInfo.timer) == null ? void 0 : _a.stop();
      this.orderInfo.timer = null;
    },
    // Poll to create a timer and send a recording
    querySendRecord() {
      return __async(this, null, function* () {
        if (this.recordTimer)
          return;
        this.stopQuerySendRecord();
        this.recordTimer = new class_TimerClass.TimerClass({
          time: 5e3,
          callback: () => __async(this, null, function* () {
            var _a;
            (_a = this.recorderManagerInstance) == null ? void 0 : _a.stopRecord();
            this.recorderManagerInstance = new class_RecorderManagerClass.RecorderManagerClass({
              recordCallback: (res) => {
                console.log("res----", res);
                common_vendor.wx$1.uploadFile({
                  url: "http://localhost:8600/driver-api/monitor/upload",
                  //仅为示例，非真实的接口地址
                  filePath: res.tempFilePath,
                  header: { token: utils_storage.getToken() },
                  name: "file",
                  formData: {
                    orderId: this.orderInfo.orderId,
                    content: res.result
                  },
                  success(res2) {
                    console.log("res---uploadFile", res2);
                  }
                });
              }
            });
            this.recorderManagerInstance.startRecord();
          })
        });
        this.recordTimer.start();
      });
    },
    stopQuerySendRecord() {
      var _a;
      console.log("停止轮询生成录音--------stopQuerySendRecord");
      (_a = this.recordTimer) == null ? void 0 : _a.stop();
      this.recordTimer = null;
    },
    //   规划司机接乘客路径CarInfo     Plan the driver's route to pick up passengersCarInfo
    driversPickUpPassengersRoutePlan() {
      return __async(this, null, function* () {
        const from = this.carInfo.from;
        const to = this.from;
        const params = {
          startPointLongitude: from.longitude,
          startPointLatitude: from.latitude,
          endPointLongitude: to.longitude,
          endPointLatitude: to.latitude
        };
        const res = yield api_order_index.getExpectOrder(params);
        const route = res.data;
        const duration = route.duration;
        const distance = route.distance;
        const polyline = [
          {
            points: formatPolyline(route.polyline),
            width: 6,
            color: "#05B473",
            arrowLine: true
          }
        ];
        const markers = [
          {
            id: 1,
            latitude: to.latitude,
            longitude: to.longitude,
            width: 25,
            height: 35,
            anchor: {
              x: 0.5,
              y: 0.5
            },
            iconPath: common_assets.endImgUrl
          },
          {
            id: 2,
            latitude: from.latitude,
            longitude: from.longitude,
            width: 25,
            height: 35,
            anchor: {
              x: 0.5,
              y: 0.5
            },
            iconPath: common_assets.driver
          }
        ];
        this.setCarRouteInfo({
          polyline,
          distance,
          duration,
          markers
        });
      });
    }
  }
});
exports.useTakeCarInfoStore = useTakeCarInfoStore;

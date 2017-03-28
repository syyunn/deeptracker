'use strict';

namespace application {

  interface IScope extends ng.IScope {
    optionsHeatLine: any;
    optionsDetail: any;
    optionsCls: {};
    optionsMatrix: {};
    dataModel: any;
    dataMatrix: any;
    dataCls: any;
    dataDetail: any;
    selectedCls: any[];
    selectedClsInverted: any[];
    open: any;
    flip: any;
    click: any;
    showModal: any;
    btnShow: any;
    hovering: any;
    mouseleave: any;
  }

  class Controller {
    public static $inject: string[] = [
      '$scope', 'DataManager', 'Global', '$q',
      'Pip', '$timeout', '$modal', '$rootScope'
    ];

    constructor(
      public $scope: IScope,
      public DataManager: IDataManagerService,
      public Global: IGlobalService,
      public $q: ng.IQService,
      public Pip: IPipService,
      public $timeout: ng.ITimeoutService,
      public $modal,
      public $rootScope
    ) {
      let this_ = this;
      let first;

      $scope.hovering = function (name) {
        Pip.emitHoveringCls(name);
        // Pip.emitHoveringLayer(name);
      };

      $scope.mouseleave = function (name) {
        Pip.emitLeavingCls(name);
        // $('.layer-bar-' + name).css('background', '#489ff2');
        // Pip.emitLeavingLayer(name);
      };

      Pip.onHoveringCls($scope, name => {
        $('.cls-name-' + name).css('color', '#f9a814');
        $('.clsbox-' + name)
          .css('border', '1px solid')
          .css('border-color', '#f9a814')
          .css('z-index', '300');
      });

      Pip.onLeavingCls($scope, name => {
        $('.cls-name-' + name).css('color', 'black');
        $('.clsbox-' + name)
          .css('border', '0px solid');
      });

      let previous_conf = null;
      this_._init();
      let modal = $modal({
        scope: $scope,
        templateUrl: 'src/client/visualization/views/tpls/img-modal.client.tpls.html',
        show: false,
        controller: 'ImgModalController',
        keyboard: true
      });

      function updateContainerHeight() {
        setTimeout(function () {
          // console.log($('.label-chart').height());
          // console.log($('div[heatline]').height());
          $('#widget-container-labelinfo').height($('.label-chart').height());
          updateContainerHeight();
        }, 3000);
      }
      updateContainerHeight();


      $scope.showModal = function (name, type) {
        modal.$scope.cls = name;
        modal.$scope.type = 'class';
        modal.$promise.then(modal.show);
      };

      Pip.onShowModal($scope, (msg: any) => {
        modal.$scope.name = msg.key;
        modal.$scope.cls = msg.cls;
        modal.$scope.type = 'file';
        modal.$promise.then(modal.show);
      });

      $scope.click = function (type: string, clsName?: string) {
        if (type === 'open') {
          $scope.open = !$scope.open;
          if ($scope.open) {
            // $scope.selectedCls = Global.getData('info').cls;
            // fetch dataCls
          }
        } else if (type === 'flip') {
          $scope.flip[clsName] = !$scope.flip[clsName];
          $scope.optionsCls[clsName].triangle = Global.getConfig('label').triangle;
          if ($scope.flip[clsName]) {
            showDetail(clsName);
          }
        } else if (type === 'zoomin') {
          $scope.$broadcast('zoom', { type: 'in', cls: clsName });
        } else if (type === 'zoomout') {
          $scope.$broadcast('zoom', { type: 'out', cls: clsName });
        }
      };


      Pip.onTimeChanged($scope, (iter) => {
        console.log('select iter: ', iter);
      });
      Pip.onModelChanged($scope, (msg) => {
        first = true;
        // act();
      });
      Pip.onLabelConfigChanged($scope, (conf: any) => {
        if (conf.show === true) { act(conf); }
      });

      function showDetail(clsName: string) {
        DataManager.fetchImg({
          db: Global.getSelectedDB(),
          type: 'detail',
          cls: [clsName],
          parser: 'json'
        }, false).then((data: any) => {

          $scope.optionsDetail[clsName] = this_._setOptions('pixelChartWithLine', data.length);
          $scope.optionsDetail[clsName].threshold = $scope.optionsCls[clsName].threshold;
          $scope.optionsDetail[clsName].max = $scope.optionsCls[clsName].max;

          $scope.dataDetail[clsName] = {
            pixelChart: data,
            lineChart: $scope.dataCls[clsName].linechartData
          };
        });
      }

      function act(conf) {
        if (first) {
          $scope.optionsHeatLine = this_._setOptions('heatline');
          $scope.optionsHeatLine.height = 100;
          let gd = Global.getData();

          $scope.dataModel = {
            heatmapData: Global.getData('record').testError,
            linechartData: gd.label.modelStat,
            max: d4.max(gd.label.modelStat, (d: any) => d.value)
          };

          $scope.optionsCls = {};
          $scope.dataCls = this_._processData('cls_heatline', gd.label.clsStat, $scope.dataModel.max);
          gd.label.clsStat = null;

          first = false;
        }

        let selectedCls = [], maxPMax = Number.MIN_SAFE_INTEGER;
        _.each($scope.dataCls, (d: any, k) => {
          if (d.pmax > maxPMax) { maxPMax = d.pmax; }
          // if (d.rpmax > maxPMax) { maxPMax = d.rpmax; }
        });

        let root = '/assets/images/gallery/';
        let currentDBName = this_.Global.getSelectedDB();
        if (_.startsWith(currentDBName, 'imagenet')) {
          root += 'imagenet/';
        } else if (_.startsWith(currentDBName, 'cifar')) {
          root += 'cifar/';
        }
        _.each($scope.dataCls, (d: any, k) => {
          let findedCls = _.find(Global.getData('info').cls, (o: any) => o.name === k);
          let firstFile = findedCls.file[0];
          // if (d.pmax >= conf.threshold || d.rpmax >= conf.threshold) {
          if (d.pmax >= conf.threshold) {
            $scope.optionsCls[k] = this_._setOptions('heatline');
            $scope.optionsCls[k].threshold = conf.threshold;
            $scope.optionsCls[k].triangle = conf.triangle;
            $scope.optionsCls[k].immediate = conf.immediate;
            $scope.optionsCls[k].max = maxPMax;
            selectedCls.push({ name: k, pmax: d.pmax, file: root + k + '/' + firstFile });
          }
        });

        if (selectedCls.length > 588) {
          selectedCls = selectedCls.slice(0, 588);
        }

        if (conf.mds && selectedCls.length < 600) {
          console.log('calc mds !!');
          let tmp = [];
          _.each(selectedCls, d => {
            let v = _.map($scope.dataCls[d.name].heatmapData, (o: any) => o.value);
            tmp.push({ name: d.name, value: v });
          });
          tmp = mdsLayout(tmp);
          $scope.selectedCls = [];
          for (let i = 0; i < selectedCls.length; i += 1) {
            $scope.selectedCls.push(selectedCls[tmp[i]]);
          }
        } else {
          $scope.selectedCls = _.reverse(_.sortBy(selectedCls, ['pmax']));
        }

        let iterInfo = Global.getData('iter');
        let iterSet = new Set();
        let rec = [];
        let resMap = new Map();
        for (let i = 0; i < $scope.selectedCls.length; i += 1) {
          let tmp = [];
          rec.push(new Set());
          let cc = 0;
          let d = $scope.dataCls[$scope.selectedCls[i].name].linechartData;
          for (let j = 0; j < d.length; j += 1) {
            if (d[j].value >= conf.threshold) {
              cc += 1;
              // iterSet.add(iterInfo.array[j]);
              rec[i].add(iterInfo.array[j]);
              tmp.push(iterInfo.array[j]);
            }
            if (d[j].valueR >= conf.threshold) {
              if (j + 1 < iterInfo.array.length) {
                cc += 1;
                tmp.push(iterInfo.array[j + 1]);
                // iterSet.add(iterInfo.array[j + 1]);
                rec[i].add(iterInfo.array[j + 1]);
              }
            }
          }
          if (cc < 2) {
            $scope.selectedCls.splice(i, 1);
            rec.splice(i, 1);
            i -= 1;
          } else {
            for (let o of tmp) { iterSet.add(o); }
          }
          // !!!! delete cls with outlier iter only once
        }

        // manual order
        let orderArr = [
          'n11879895',
          'n02489166',
          'n11939491',
          'n04487081',
          'n03344393',
          'n03447447',
          'n04562935',
          'n02509815',
          'n02510455',
          'n01531178',
          'n02951358',
          'n04153751',
          'n06359193',
          'n03590841',
          'n02965783',
          'n02280649',
          'n03888257',
          'n01930112',
          'n02782093',
          'n02690373',
          'n07730033',
          'n03956157',
          'n04019541',
          'n04398044',
          'n01910747',
          'n02096051',
          'n10565667',
          'n03791053',
          'n02097209',
          'n12998815',
          'n04147183',
          'n01773797',
          'n03447721',
          'n01773157',
          'n04536866',
          'n02895154'
        ];

        // order as specified order
        let tmpCls = [], tmpRec = [];
        for (let o of orderArr) {
          let idx = _.findIndex($scope.selectedCls, d => d.name === o);
          if (idx >= 0) {
            tmpCls.push($scope.selectedCls[idx]);
            tmpRec.push(rec[idx]);
          }
        }
        $scope.selectedCls = tmpCls;
        rec = tmpRec;

        $scope.selectedClsInverted = _.cloneDeep($scope.selectedCls);
        _.reverse($scope.selectedClsInverted);

        let allQuery = {};
        let parser = 'json', type = 'i_cosine', db = Global.getSelectedDB();
        iterSet.forEach((v) => {
          allQuery[v] = DataManager.fetchKernel({ db, type, iter: v, parser }, false);
        });
        console.time('startA');
        let lidtoName = {};
        $('#correlation-data-loading').removeClass('invisible');
        $q.all(allQuery).then((data: any) => {
          console.timeEnd('startA');
          for (let i = 0; i < $scope.selectedCls.length; i += 1) {
            rec[i].forEach((v) => {
              let d = data[v];
              for (let j = 0; j < d.length; j += 1) {
                if (!lidtoName[d[j].lid]) { lidtoName[d[j].lid] = d[j].name; }
                if (!resMap.has(d[j].lid)) { resMap.set(d[j].lid, {}); }
                let o = resMap.get(d[j].lid);
                if (!o[i]) { o[i] = {}; };
                if (!o[i][v]) { o[i][v] = [rec[i]]; }
                o[i][v].push(d[j].idx);
              }
            });
          }
          Pip.emitCorrelationReady({
            data: resMap,
            options: {
              class: $scope.selectedCls,
              classNum: $scope.selectedCls.length,
              allLayers: this_.Global.getData('correlation').allLayers,
              lidtoName,
              rec,
              width: 2000,
              height: 1600,
              minHeight: 2,
              minWidth: 8,
              threshold: 4,
              h: 4,
              w: 4,
              space: 1,
              margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
              }
            }
          });
          $('#correlation-data-loading').addClass('invisible');
        });

      }

      Pip.onClsWidth($scope, msg => {
        for (let i = 0; i < $scope.selectedCls.length; i += 1) {
          $scope.optionsCls[$scope.selectedCls[i].name].height = msg[i] / 1.96261051;
          $('#label-edgebar-' + $scope.selectedCls[i].name)
            .css('height', msg[i] / 1.96261051 - 1);
        }
        Pip.emitRenderLabelView(null);
        // scroll to bottom
        // $('.face-top').scrollTop($('.face-top').height());
        // console.log($scope.selectedCls, msg);
      });

      Pip.onShowTopKernel($scope, (msg => {
        let parser = 'json', type = 'i_cosine', db = Global.getSelectedDB();
        let iterInfo = Global.getData('iter');
        let allQuery = [];
        for (let iter of iterInfo.picked) {
          allQuery.push(DataManager.fetchKernel({ db, type, iter: iter[1], parser }, false));
        }
        $('#layer-data-loading').removeClass('invisible');
        $q.all(allQuery).then((data: any) => {
          // computer intersect
          if (iterInfo.picked.length === 1) { data[0] = data[0].slice(0, 20); }
          let map = new Map();
          _.each(data, (d: any) => {
            for (let i = 0; i < d.length; i += 1) {
              let name = d[i].lid.toString() + '.' + d[i].idx.toString();
              if (!map.has(name)) { map.set(name, { count: 0, d: [] }); }
              let td = map.get(name);
              td.count += 1;
              td.d.push(d[i]);
            }
          });
          let lmap = new Map();
          map.forEach((v, k) => {
            if (v.count === data.length) {
              if (!lmap.has(v.d[0].name)) { lmap.set(v.d[0].name, { v: [], lid: v.d[0].lid }); };
              let tmp = lmap.get(v.d[0].name);
              tmp.v.push(v.d[0].idx);
            }
          });

          let qArray = {};
          lmap.forEach((v, k) => {
            qArray[k] = DataManager.fetchKernel({
              db, type, layer: [v.lid], seqidx: v.v, parser
            }, false);
          });
          $scope.dataTopK = {};
          $scope.optionsTopK = {};
          if (!_.isEmpty(qArray)) {
            $q.all(qArray).then(kernelData => {
              $('#layer-data-loading').addClass('invisible');
              _.each(kernelData, (v, k) => {
                $scope.dataTopK[k] = _.map(v, (vd: any) => {
                  return {
                    heatmapData: vd.value,
                    linechartData: null
                  };
                });
                $scope.showTypes[k] = 'topk';
                $scope.optionsTopK[k] = this_._setOptions('heatline');
                $scope.optionsTopK[k].num = $scope.layers[k].kernelNum;
                let cnode = layerTree[k];
                let count = 0;
                if (cnode.parent) {
                  // console.log(cnode.parent);
                  // console.log(cnode.parent.parent);
                  $scope.opened[cnode.parent.parent.name] = true;
                  $scope.opened[cnode.parent.name] = true;
                  $('#' + cnode.parent.parent.name).show();
                  $('#' + cnode.parent.parent.name + ' .level2').show();
                  $('#' + cnode.parent.name + ' .level3').show();
                  count += 1;
                }
                // console.log(count);
                // console.log(k, v);
              });
            });
          }

        });
      }));

      function mdsLayout(data) {
        let result = [];
        let distMatrix = [];
        let length = data.length;
        let max = -1;
        for (let i = 0; i < length; i += 1) {
          distMatrix.push(Array(length).fill(0));
          distMatrix[i][i] = 0;
          for (let j = i - 1; j >= 0; j -= 1) { distMatrix[i][j] = distMatrix[j][i]; }
          for (let j = i + 1; j < length; j += 1) {
            distMatrix[i][j] = computeDist2(data[i].value, data[j].value);
            if (distMatrix[i][j] > max) { max = distMatrix[i][j]; }
          }
        }

        let fs = d4.scaleLinear().range([0, 1]).domain([0, max]).clamp(true);
        for (let i = 0; i < length; i += 1) {
          for (let j = 0; j < length; j += 1) {
            distMatrix[i][j] = fs(distMatrix[i][j]);
          }
        }
        let coordinate = _.map(LG.utils.Mds.mds(distMatrix, 1), (d, i) => {
          return [i, d[0]];
        });
        coordinate = _.sortBy(coordinate, d => d[1]);
        for (let i = 0; i < data.length; i += 1) {
          let idx = coordinate[i][0];
          result.push(idx);
        }
        return result;

      }

      function computeDist(va, vb) {
        let size = va.length;
        let dist = 0;
        for (let i = 0; i < size; i += 1) {
          dist += va[i] !== vb[i] ? 1 : 0;
        }
        return dist;
      }

      // cos
      function computeDist2(va, vb) {
        let nva = numeric.norm2(va);
        let nvb = numeric.norm2(vb);
        if (nva !== 0 && nvb !== 0) {
          return 1 - numeric.dot(va, vb) / (numeric.norm2(va) * numeric.norm2(vb));
        }
        return 1;
      }

    }
    // end of constructor

    private _init() {

      let this_ = this;
      let cls = this_.Global.getData('info').cls;
      this_.$scope.open = false;
      this_.$scope.flip = {};
      this_.$scope.optionsDetail = {};
      _.each(cls, c => {
        this_.$scope.flip[c.name] = false;
      });
      this_.$scope.dataDetail = {};

      this_.$timeout(function () {
        $('#widget-container-labelinfo .scrollable').each(function () {
          let $this = $(this);
          $(this).ace_scroll({
            size: $this.attr('data-size') || 100,
          });
        });
      }, 100);

      $('#widget-container-labelinfo')
        .mouseenter(function () {
          $('#widget-container-labelinfo .widget-header:first-child').removeClass('invisible');
          this_.$scope.$apply(function () {
            this_.$scope.btnShow = true;
          });
        })
        .mouseleave(function () {
          $('#widget-container-labelinfo .widget-header:first-child').addClass('invisible');
          this_.$scope.$apply(function () {
            this_.$scope.btnShow = false;
          });
        });
    }

    private _processData(type, ...rest: any[]) {
      let this_ = this;
      let result = {};
      let data, max;
      switch (type) {
        case 'cls_heatline':
          [data, max] = [rest[0], rest[1]];
          for (let d of data) {
            if (!result[d.cls]) {
              result[d.cls] = { heatmapData: [], linechartData: [], max, pmax: -1, rpmax: -1 };
            }
            result[d.cls].heatmapData.push({ iter: d.iter, value: d.testError });
            result[d.cls].linechartData.push({ iter: d.iter, value: d.value, valueR: d.valueR });
            result[d.cls].pmax = result[d.cls].pmax < d.value ? d.value : result[d.cls].pmax;
            result[d.cls].rpmax = result[d.cls].rpmax < d.valueR ? d.valueR : result[d.cls].rpmax;
          }
          _.each(result, (d: any) => {
            d.heatmapData = _.sortBy(d.heatmapData, ['iter']);
            d.linechartData = _.sortBy(d.linechartData, ['iter']);
          });
          return result;
        case 'cls_pixelchart':
          break;
        default:
          break;
      }
    }

    private _setOptions(type, height?) {
      let this_ = this;
      let options;
      switch (type) {
        case 'heatline':
          options = {
            width: this_.Global.getData('iter').num + 30,
            // height: height ? height : 16,
            height: 8,
            cellWidth: 1,
            color: d4.scaleSequential(d4.interpolateRdYlGn),
            margin: {
              top: 0,
              right: 0,
              bottom: 0,
              left: 0
            },
            type: 'cls',
            lineChart: false
          };
          break;
        case 'pixelChartWithLine':
          options = {
            width: this_.Global.getData('iter').num + 30,
            height: height ? height + 20 : 50,
            cellWidth: 1,
            pixelChart: true,
            lineChart: true,
            color: function (d) {
              // if (d === 1) { return '#7fc97f'; } else { return '#fdc086'; };
              if (d === 1) { return '#B6EB9D'; } else { return '#E88984'; };
            },
            marginTop: 9,
            margin: {
              top: 9,
              right: 30,
              bottom: 0,
              left: 0
            }
          };
      }
      return options;
    }


  }
  angular
    .module('vis')
    .controller('LabelController', Controller);
}

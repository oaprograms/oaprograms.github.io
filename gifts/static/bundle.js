/*! angularjs-slider - v6.4.2 - 
 (c) Rafal Zajac <rzajac@gmail.com>, Valentin Hervieu <valentin@hervieu.me>, Jussi Saarivirta <jusasi@gmail.com>, Angelin Sirbu <angelin.sirbu@gmail.com> - 
 https://github.com/angular-slider/angularjs-slider - 
 2017-12-01 */
/*jslint unparam: true */
/*global angular: false, console: false, define, module */
;(function(root, factory) {
  'use strict'
  /* istanbul ignore next */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['angular'], factory)
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    // to support bundler like browserify
    var angularObj = angular || require('angular')
    if ((!angularObj || !angularObj.module) && typeof angular != 'undefined') {
      angularObj = angular
    }
    module.exports = factory(angularObj)
  } else {
    // Browser globals (root is window)
    factory(root.angular)
  }
})(this, function(angular) {
  'use strict'
  var module = angular
    .module('rzModule', [])
    .factory('RzSliderOptions', function() {
      var defaultOptions = {
        floor: 0,
        ceil: null, //defaults to rz-slider-model
        step: 1,
        precision: 0,
        minRange: null,
        maxRange: null,
        pushRange: false,
        minLimit: null,
        maxLimit: null,
        id: null,
        translate: null,
        getLegend: null,
        stepsArray: null,
        bindIndexForStepsArray: false,
        draggableRange: false,
        draggableRangeOnly: false,
        showSelectionBar: false,
        showSelectionBarEnd: false,
        showSelectionBarFromValue: null,
        showOuterSelectionBars: false,
        hidePointerLabels: false,
        hideLimitLabels: false,
        autoHideLimitLabels: true,
        readOnly: false,
        disabled: false,
        interval: 350,
        showTicks: false,
        showTicksValues: false,
        ticksArray: null,
        ticksTooltip: null,
        ticksValuesTooltip: null,
        vertical: false,
        getSelectionBarColor: null,
        getTickColor: null,
        getPointerColor: null,
        keyboardSupport: true,
        scale: 1,
        enforceStep: true,
        enforceRange: false,
        noSwitching: false,
        onlyBindHandles: false,
        onStart: null,
        onChange: null,
        onEnd: null,
        rightToLeft: false,
        reversedControls: false,
        boundPointerLabels: true,
        mergeRangeLabelsIfSame: false,
        customTemplateScope: null,
        logScale: false,
        customValueToPosition: null,
        customPositionToValue: null,
        selectionBarGradient: null,
        ariaLabel: null,
        ariaLabelledBy: null,
        ariaLabelHigh: null,
        ariaLabelledByHigh: null
      }
      var globalOptions = {}

      var factory = {}
      /**
     * `options({})` allows global configuration of all sliders in the
     * application.
     *
     *   var app = angular.module( 'App', ['rzModule'], function( RzSliderOptions ) {
     *     // show ticks for all sliders
     *     RzSliderOptions.options( { showTicks: true } );
     *   });
     */
      factory.options = function(value) {
        angular.extend(globalOptions, value)
      }

      factory.getOptions = function(options) {
        return angular.extend({}, defaultOptions, globalOptions, options)
      }

      return factory
    })
    .factory('rzThrottle', ['$timeout', function($timeout) {
      /**
     * rzThrottle
     *
     * Taken from underscore project
     *
     * @param {Function} func
     * @param {number} wait
     * @param {ThrottleOptions} options
     * @returns {Function}
     */
      return function(func, wait, options) {
        'use strict'
        /* istanbul ignore next */
        var getTime =
          Date.now ||
          function() {
            return new Date().getTime()
          }
        var context, args, result
        var timeout = null
        var previous = 0
        options = options || {}
        var later = function() {
          previous = getTime()
          timeout = null
          result = func.apply(context, args)
          context = args = null
        }
        return function() {
          var now = getTime()
          var remaining = wait - (now - previous)
          context = this
          args = arguments
          if (remaining <= 0) {
            $timeout.cancel(timeout)
            timeout = null
            previous = now
            result = func.apply(context, args)
            context = args = null
          } else if (!timeout && options.trailing !== false) {
            timeout = $timeout(later, remaining)
          }
          return result
        }
      }
    }])
    .factory('RzSlider', ['$timeout', '$document', '$window', '$compile', 'RzSliderOptions', 'rzThrottle', function(
      $timeout,
      $document,
      $window,
      $compile,
      RzSliderOptions,
      rzThrottle
    ) {
      'use strict'

      /**
     * Slider
     *
     * @param {ngScope} scope            The AngularJS scope
     * @param {Element} sliderElem The slider directive element wrapped in jqLite
     * @constructor
     */
      var Slider = function(scope, sliderElem) {
        /**
       * The slider's scope
       *
       * @type {ngScope}
       */
        this.scope = scope

        /**
       * The slider inner low value (linked to rzSliderModel)
       * @type {number}
       */
        this.lowValue = 0

        /**
       * The slider inner high value (linked to rzSliderHigh)
       * @type {number}
       */
        this.highValue = 0

        /**
       * Slider element wrapped in jqLite
       *
       * @type {jqLite}
       */
        this.sliderElem = sliderElem

        /**
       * Slider type
       *
       * @type {boolean} Set to true for range slider
       */
        this.range =
          this.scope.rzSliderModel !== undefined &&
          this.scope.rzSliderHigh !== undefined

        /**
       * Values recorded when first dragging the bar
       *
       * @type {Object}
       */
        this.dragging = {
          active: false,
          value: 0,
          difference: 0,
          position: 0,
          lowLimit: 0,
          highLimit: 0
        }

        /**
       * property that handle position (defaults to left for horizontal)
       * @type {string}
       */
        this.positionProperty = 'left'

        /**
       * property that handle dimension (defaults to width for horizontal)
       * @type {string}
       */
        this.dimensionProperty = 'width'

        /**
       * Half of the width or height of the slider handles
       *
       * @type {number}
       */
        this.handleHalfDim = 0

        /**
       * Maximum position the slider handle can have
       *
       * @type {number}
       */
        this.maxPos = 0

        /**
       * Precision
       *
       * @type {number}
       */
        this.precision = 0

        /**
       * Step
       *
       * @type {number}
       */
        this.step = 1

        /**
       * The name of the handle we are currently tracking
       *
       * @type {string}
       */
        this.tracking = ''

        /**
       * Minimum value (floor) of the model
       *
       * @type {number}
       */
        this.minValue = 0

        /**
       * Maximum value (ceiling) of the model
       *
       * @type {number}
       */
        this.maxValue = 0

        /**
       * The delta between min and max value
       *
       * @type {number}
       */
        this.valueRange = 0

        /**
       * If showTicks/showTicksValues options are number.
       * In this case, ticks values should be displayed below the slider.
       * @type {boolean}
       */
        this.intermediateTicks = false

        /**
       * Set to true if init method already executed
       *
       * @type {boolean}
       */
        this.initHasRun = false

        /**
       * Used to call onStart on the first keydown event
       *
       * @type {boolean}
       */
        this.firstKeyDown = false

        /**
       * Internal flag to prevent watchers to be called when the sliders value are modified internally.
       * @type {boolean}
       */
        this.internalChange = false

        /**
       * Internal flag to keep track of the visibility of combo label
       * @type {boolean}
       */
        this.cmbLabelShown = false

        /**
       * Internal variable to keep track of the focus element
       */
        this.currentFocusElement = null

        // Slider DOM elements wrapped in jqLite
        this.fullBar = null // The whole slider bar
        this.selBar = null // Highlight between two handles
        this.minH = null // Left slider handle
        this.maxH = null // Right slider handle
        this.flrLab = null // Floor label
        this.ceilLab = null // Ceiling label
        this.minLab = null // Label above the low value
        this.maxLab = null // Label above the high value
        this.cmbLab = null // Combined label
        this.ticks = null // The ticks

        // Initialize slider
        this.init()
      }

      // Add instance methods
      Slider.prototype = {
        /**
       * Initialize slider
       *
       * @returns {undefined}
       */
        init: function() {
          var thrLow,
            thrHigh,
            self = this

          var calcDimFn = function() {
            self.calcViewDimensions()
          }

          this.applyOptions()
          this.syncLowValue()
          if (this.range) this.syncHighValue()
          this.initElemHandles()
          this.manageElementsStyle()
          this.setDisabledState()
          this.calcViewDimensions()
          this.setMinAndMax()
          this.addAccessibility()
          this.updateCeilLab()
          this.updateFloorLab()
          this.initHandles()
          this.manageEventsBindings()

          // Recalculate slider view dimensions
          this.scope.$on('reCalcViewDimensions', calcDimFn)

          // Recalculate stuff if view port dimensions have changed
          angular.element($window).on('resize', calcDimFn)

          this.initHasRun = true

          // Watch for changes to the model
          thrLow = rzThrottle(function() {
            self.onLowHandleChange()
          }, self.options.interval)

          thrHigh = rzThrottle(function() {
            self.onHighHandleChange()
          }, self.options.interval)

          this.scope.$on('rzSliderForceRender', function() {
            self.resetLabelsValue()
            thrLow()
            if (self.range) {
              thrHigh()
            }
            self.resetSlider()
          })

          // Watchers (order is important because in case of simultaneous change,
          // watchers will be called in the same order)
          this.scope.$watchCollection('rzSliderOptions()', function(
            newValue,
            oldValue
          ) {
            if (newValue === oldValue) return
            self.applyOptions() // need to be called before synchronizing the values
            self.syncLowValue()
            if (self.range) self.syncHighValue()
            self.resetSlider()
          })

          this.scope.$watch('rzSliderModel', function(newValue, oldValue) {
            if (self.internalChange) return
            if (newValue === oldValue) return
            thrLow()
          })

          this.scope.$watch('rzSliderHigh', function(newValue, oldValue) {
            if (self.internalChange) return
            if (newValue === oldValue) return
            if (newValue != null) thrHigh()
            if (
              (self.range && newValue == null) ||
              (!self.range && newValue != null)
            ) {
              self.applyOptions()
              self.resetSlider()
            }
          })

          this.scope.$on('$destroy', function() {
            self.unbindEvents()
            angular.element($window).off('resize', calcDimFn)
            self.currentFocusElement = null
          })
        },

        findStepIndex: function(modelValue) {
          var index = 0
          for (var i = 0; i < this.options.stepsArray.length; i++) {
            var step = this.options.stepsArray[i]
            if (step === modelValue) {
              index = i
              break
            } else if (angular.isDate(step)) {
              if (step.getTime() === modelValue.getTime()) {
                index = i
                break
              }
            } else if (angular.isObject(step)) {
              if (
                (angular.isDate(step.value) &&
                  step.value.getTime() === modelValue.getTime()) ||
                step.value === modelValue
              ) {
                index = i
                break
              }
            }
          }
          return index
        },

        syncLowValue: function() {
          if (this.options.stepsArray) {
            if (!this.options.bindIndexForStepsArray)
              this.lowValue = this.findStepIndex(this.scope.rzSliderModel)
            else this.lowValue = this.scope.rzSliderModel
          } else this.lowValue = this.scope.rzSliderModel
        },

        syncHighValue: function() {
          if (this.options.stepsArray) {
            if (!this.options.bindIndexForStepsArray)
              this.highValue = this.findStepIndex(this.scope.rzSliderHigh)
            else this.highValue = this.scope.rzSliderHigh
          } else this.highValue = this.scope.rzSliderHigh
        },

        getStepValue: function(sliderValue) {
          var step = this.options.stepsArray[sliderValue]
          if (angular.isDate(step)) return step
          if (angular.isObject(step)) return step.value
          return step
        },

        applyLowValue: function() {
          if (this.options.stepsArray) {
            if (!this.options.bindIndexForStepsArray)
              this.scope.rzSliderModel = this.getStepValue(this.lowValue)
            else this.scope.rzSliderModel = this.lowValue
          } else this.scope.rzSliderModel = this.lowValue
        },

        applyHighValue: function() {
          if (this.options.stepsArray) {
            if (!this.options.bindIndexForStepsArray)
              this.scope.rzSliderHigh = this.getStepValue(this.highValue)
            else this.scope.rzSliderHigh = this.highValue
          } else this.scope.rzSliderHigh = this.highValue
        },

        /*
       * Reflow the slider when the low handle changes (called with throttle)
       */
        onLowHandleChange: function() {
          this.syncLowValue()
          if (this.range) this.syncHighValue()
          this.setMinAndMax()
          this.updateLowHandle(this.valueToPosition(this.lowValue))
          this.updateSelectionBar()
          this.updateTicksScale()
          this.updateAriaAttributes()
          if (this.range) {
            this.updateCmbLabel()
          }
        },

        /*
       * Reflow the slider when the high handle changes (called with throttle)
       */
        onHighHandleChange: function() {
          this.syncLowValue()
          this.syncHighValue()
          this.setMinAndMax()
          this.updateHighHandle(this.valueToPosition(this.highValue))
          this.updateSelectionBar()
          this.updateTicksScale()
          this.updateCmbLabel()
          this.updateAriaAttributes()
        },

        /**
       * Read the user options and apply them to the slider model
       */
        applyOptions: function() {
          var sliderOptions
          if (this.scope.rzSliderOptions)
            sliderOptions = this.scope.rzSliderOptions()
          else sliderOptions = {}

          this.options = RzSliderOptions.getOptions(sliderOptions)

          if (this.options.step <= 0) this.options.step = 1

          this.range =
            this.scope.rzSliderModel !== undefined &&
            this.scope.rzSliderHigh !== undefined
          this.options.draggableRange =
            this.range && this.options.draggableRange
          this.options.draggableRangeOnly =
            this.range && this.options.draggableRangeOnly
          if (this.options.draggableRangeOnly) {
            this.options.draggableRange = true
          }

          this.options.showTicks =
            this.options.showTicks ||
            this.options.showTicksValues ||
            !!this.options.ticksArray
          this.scope.showTicks = this.options.showTicks //scope is used in the template
          if (
            angular.isNumber(this.options.showTicks) ||
            this.options.ticksArray
          )
            this.intermediateTicks = true

          this.options.showSelectionBar =
            this.options.showSelectionBar ||
            this.options.showSelectionBarEnd ||
            this.options.showSelectionBarFromValue !== null

          if (this.options.stepsArray) {
            this.parseStepsArray()
          } else {
            if (this.options.translate) this.customTrFn = this.options.translate
            else
              this.customTrFn = function(value) {
                return String(value)
              }

            this.getLegend = this.options.getLegend
          }

          if (this.options.vertical) {
            this.positionProperty = 'bottom'
            this.dimensionProperty = 'height'
          }

          if (this.options.customTemplateScope)
            this.scope.custom = this.options.customTemplateScope
        },

        parseStepsArray: function() {
          this.options.floor = 0
          this.options.ceil = this.options.stepsArray.length - 1
          this.options.step = 1

          if (this.options.translate) {
            this.customTrFn = this.options.translate
          } else {
            this.customTrFn = function(modelValue) {
              if (this.options.bindIndexForStepsArray)
                return this.getStepValue(modelValue)
              return modelValue
            }
          }

          this.getLegend = function(index) {
            var step = this.options.stepsArray[index]
            if (angular.isObject(step)) return step.legend
            return null
          }
        },

        /**
       * Resets slider
       *
       * @returns {undefined}
       */
        resetSlider: function() {
          this.manageElementsStyle()
          this.addAccessibility()
          this.setMinAndMax()
          this.updateCeilLab()
          this.updateFloorLab()
          this.unbindEvents()
          this.manageEventsBindings()
          this.setDisabledState()
          this.calcViewDimensions()
          this.refocusPointerIfNeeded()
        },

        refocusPointerIfNeeded: function() {
          if (this.currentFocusElement) {
            this.onPointerFocus(
              this.currentFocusElement.pointer,
              this.currentFocusElement.ref
            )
            this.focusElement(this.currentFocusElement.pointer)
          }
        },

        /**
       * Set the slider children to variables for easy access
       *
       * Run only once during initialization
       *
       * @returns {undefined}
       */
        initElemHandles: function() {
          // Assign all slider elements to object properties for easy access
          angular.forEach(
            this.sliderElem.children(),
            function(elem, index) {
              var jElem = angular.element(elem)

              switch (index) {
                case 0:
                  this.leftOutSelBar = jElem
                  break
                case 1:
                  this.rightOutSelBar = jElem
                  break
                case 2:
                  this.fullBar = jElem
                  break
                case 3:
                  this.selBar = jElem
                  break
                case 4:
                  this.minH = jElem
                  break
                case 5:
                  this.maxH = jElem
                  break
                case 6:
                  this.flrLab = jElem
                  break
                case 7:
                  this.ceilLab = jElem
                  break
                case 8:
                  this.minLab = jElem
                  break
                case 9:
                  this.maxLab = jElem
                  break
                case 10:
                  this.cmbLab = jElem
                  break
                case 11:
                  this.ticks = jElem
                  break
              }
            },
            this
          )

          // Initialize position cache properties
          this.selBar.rzsp = 0
          this.minH.rzsp = 0
          this.maxH.rzsp = 0
          this.flrLab.rzsp = 0
          this.ceilLab.rzsp = 0
          this.minLab.rzsp = 0
          this.maxLab.rzsp = 0
          this.cmbLab.rzsp = 0
        },

        /**
       * Update each elements style based on options
       */
        manageElementsStyle: function() {
          if (!this.range) this.maxH.css('display', 'none')
          else this.maxH.css('display', '')

          this.alwaysHide(
            this.flrLab,
            this.options.showTicksValues || this.options.hideLimitLabels
          )
          this.alwaysHide(
            this.ceilLab,
            this.options.showTicksValues || this.options.hideLimitLabels
          )

          var hideLabelsForTicks =
            this.options.showTicksValues && !this.intermediateTicks
          this.alwaysHide(
            this.minLab,
            hideLabelsForTicks || this.options.hidePointerLabels
          )
          this.alwaysHide(
            this.maxLab,
            hideLabelsForTicks || !this.range || this.options.hidePointerLabels
          )
          this.alwaysHide(
            this.cmbLab,
            hideLabelsForTicks || !this.range || this.options.hidePointerLabels
          )
          this.alwaysHide(
            this.selBar,
            !this.range && !this.options.showSelectionBar
          )
          this.alwaysHide(
            this.leftOutSelBar,
            !this.range || !this.options.showOuterSelectionBars
          )
          this.alwaysHide(
            this.rightOutSelBar,
            !this.range || !this.options.showOuterSelectionBars
          )

          if (this.range && this.options.showOuterSelectionBars) {
            this.fullBar.addClass('rz-transparent')
          }

          if (this.options.vertical) this.sliderElem.addClass('rz-vertical')

          if (this.options.draggableRange) this.selBar.addClass('rz-draggable')
          else this.selBar.removeClass('rz-draggable')

          if (this.intermediateTicks && this.options.showTicksValues)
            this.ticks.addClass('rz-ticks-values-under')
        },

        alwaysHide: function(el, hide) {
          el.rzAlwaysHide = hide
          if (hide) this.hideEl(el)
          else this.showEl(el)
        },

        /**
       * Manage the events bindings based on readOnly and disabled options
       *
       * @returns {undefined}
       */
        manageEventsBindings: function() {
          if (this.options.disabled || this.options.readOnly)
            this.unbindEvents()
          else this.bindEvents()
        },

        /**
       * Set the disabled state based on rzSliderDisabled
       *
       * @returns {undefined}
       */
        setDisabledState: function() {
          if (this.options.disabled) {
            this.sliderElem.attr('disabled', 'disabled')
          } else {
            this.sliderElem.attr('disabled', null)
          }
        },

        /**
       * Reset label values
       *
       * @return {undefined}
       */
        resetLabelsValue: function() {
          this.minLab.rzsv = undefined
          this.maxLab.rzsv = undefined
        },

        /**
       * Initialize slider handles positions and labels
       *
       * Run only once during initialization and every time view port changes size
       *
       * @returns {undefined}
       */
        initHandles: function() {
          this.updateLowHandle(this.valueToPosition(this.lowValue))

          /*
         the order here is important since the selection bar should be
         updated after the high handle but before the combined label
         */
          if (this.range)
            this.updateHighHandle(this.valueToPosition(this.highValue))
          this.updateSelectionBar()
          if (this.range) this.updateCmbLabel()

          this.updateTicksScale()
        },

        /**
       * Translate value to human readable format
       *
       * @param {number|string} value
       * @param {jqLite} label
       * @param {String} which
       * @param {boolean} [useCustomTr]
       * @returns {undefined}
       */
        translateFn: function(value, label, which, useCustomTr) {
          useCustomTr = useCustomTr === undefined ? true : useCustomTr

          var valStr = '',
            getDimension = false,
            noLabelInjection = label.hasClass('no-label-injection')

          if (useCustomTr) {
            if (this.options.stepsArray && !this.options.bindIndexForStepsArray)
              value = this.getStepValue(value)
            valStr = String(this.customTrFn(value, this.options.id, which))
          } else {
            valStr = String(value)
          }

          if (
            label.rzsv === undefined ||
            label.rzsv.length !== valStr.length ||
            (label.rzsv.length > 0 && label.rzsd === 0)
          ) {
            getDimension = true
            label.rzsv = valStr
          }

          if (!noLabelInjection) {
            label.html(valStr)
          }
          this.scope[which + 'Label'] = valStr

          // Update width only when length of the label have changed
          if (getDimension) {
            this.getDimension(label)
          }
        },

        /**
       * Set maximum and minimum values for the slider and ensure the model and high
       * value match these limits
       * @returns {undefined}
       */
        setMinAndMax: function() {
          this.step = +this.options.step
          this.precision = +this.options.precision

          this.minValue = this.options.floor
          if (this.options.logScale && this.minValue === 0)
            throw Error("Can't use floor=0 with logarithmic scale")

          if (this.options.enforceStep) {
            this.lowValue = this.roundStep(this.lowValue)
            if (this.range) this.highValue = this.roundStep(this.highValue)
          }

          if (this.options.ceil != null) this.maxValue = this.options.ceil
          else
            this.maxValue = this.options.ceil = this.range
              ? this.highValue
              : this.lowValue

          if (this.options.enforceRange) {
            this.lowValue = this.sanitizeValue(this.lowValue)
            if (this.range) this.highValue = this.sanitizeValue(this.highValue)
          }

          this.applyLowValue()
          if (this.range) this.applyHighValue()

          this.valueRange = this.maxValue - this.minValue
        },

        /**
       * Adds accessibility attributes
       *
       * Run only once during initialization
       *
       * @returns {undefined}
       */
        addAccessibility: function() {
          this.minH.attr('role', 'slider')
          this.updateAriaAttributes()
          if (
            this.options.keyboardSupport &&
            !(this.options.readOnly || this.options.disabled)
          )
            this.minH.attr('tabindex', '0')
          else this.minH.attr('tabindex', '')
          if (this.options.vertical)
            this.minH.attr('aria-orientation', 'vertical')
          if (this.options.ariaLabel)
            this.minH.attr('aria-label', this.options.ariaLabel)
          else if (this.options.ariaLabelledBy)
            this.minH.attr('aria-labelledby', this.options.ariaLabelledBy)

          if (this.range) {
            this.maxH.attr('role', 'slider')
            if (
              this.options.keyboardSupport &&
              !(this.options.readOnly || this.options.disabled)
            )
              this.maxH.attr('tabindex', '0')
            else this.maxH.attr('tabindex', '')
            if (this.options.vertical)
              this.maxH.attr('aria-orientation', 'vertical')
            if (this.options.ariaLabelHigh)
              this.maxH.attr('aria-label', this.options.ariaLabelHigh)
            else if (this.options.ariaLabelledByHigh)
              this.maxH.attr('aria-labelledby', this.options.ariaLabelledByHigh)
          }
        },

        /**
       * Updates aria attributes according to current values
       */
        updateAriaAttributes: function() {
          this.minH.attr({
            'aria-valuenow': this.scope.rzSliderModel,
            'aria-valuetext': this.customTrFn(
              this.scope.rzSliderModel,
              this.options.id,
              'model'
            ),
            'aria-valuemin': this.minValue,
            'aria-valuemax': this.maxValue
          })
          if (this.range) {
            this.maxH.attr({
              'aria-valuenow': this.scope.rzSliderHigh,
              'aria-valuetext': this.customTrFn(
                this.scope.rzSliderHigh,
                this.options.id,
                'high'
              ),
              'aria-valuemin': this.minValue,
              'aria-valuemax': this.maxValue
            })
          }
        },

        /**
       * Calculate dimensions that are dependent on view port size
       *
       * Run once during initialization and every time view port changes size.
       *
       * @returns {undefined}
       */
        calcViewDimensions: function() {
          var handleWidth = this.getDimension(this.minH)

          this.handleHalfDim = handleWidth / 2
          this.barDimension = this.getDimension(this.fullBar)

          this.maxPos = this.barDimension - handleWidth

          this.getDimension(this.sliderElem)
          this.sliderElem.rzsp = this.sliderElem[0].getBoundingClientRect()[
            this.positionProperty
          ]

          if (this.initHasRun) {
            this.updateFloorLab()
            this.updateCeilLab()
            this.initHandles()
            var self = this
            $timeout(function() {
              self.updateTicksScale()
            })
          }
        },

        /**
       * Update the ticks position
       *
       * @returns {undefined}
       */
        updateTicksScale: function() {
          if (!this.options.showTicks) return

          var ticksArray = this.options.ticksArray || this.getTicksArray(),
            translate = this.options.vertical ? 'translateY' : 'translateX',
            self = this

          if (this.options.rightToLeft) ticksArray.reverse()

          this.scope.ticks = ticksArray.map(function(value) {
            var position = self.valueToPosition(value)

            if (self.options.vertical) position = self.maxPos - position

            var translation = translate + '(' + Math.round(position) + 'px)'
            var tick = {
              selected: self.isTickSelected(value),
              style: {
                '-webkit-transform': translation,
                '-moz-transform': translation,
                '-o-transform': translation,
                '-ms-transform': translation,
                transform: translation
              }
            }
            if (tick.selected && self.options.getSelectionBarColor) {
              tick.style['background-color'] = self.getSelectionBarColor()
            }
            if (!tick.selected && self.options.getTickColor) {
              tick.style['background-color'] = self.getTickColor(value)
            }
            if (self.options.ticksTooltip) {
              tick.tooltip = self.options.ticksTooltip(value)
              tick.tooltipPlacement = self.options.vertical ? 'right' : 'top'
            }
            if (
              self.options.showTicksValues === true ||
              value % self.options.showTicksValues === 0
            ) {
              tick.value = self.getDisplayValue(value, 'tick-value')
              if (self.options.ticksValuesTooltip) {
                tick.valueTooltip = self.options.ticksValuesTooltip(value)
                tick.valueTooltipPlacement = self.options.vertical
                  ? 'right'
                  : 'top'
              }
            }
            if (self.getLegend) {
              var legend = self.getLegend(value, self.options.id)
              if (legend) tick.legend = legend
            }
            return tick
          })
        },

        getTicksArray: function() {
          var step = this.step,
            ticksArray = []
          if (this.intermediateTicks) step = this.options.showTicks
          for (
            var value = this.minValue;
            value <= this.maxValue;
            value += step
          ) {
            ticksArray.push(value)
          }
          return ticksArray
        },

        isTickSelected: function(value) {
          if (!this.range) {
            if (this.options.showSelectionBarFromValue !== null) {
              var center = this.options.showSelectionBarFromValue
              if (
                this.lowValue > center &&
                value >= center &&
                value <= this.lowValue
              )
                return true
              else if (
                this.lowValue < center &&
                value <= center &&
                value >= this.lowValue
              )
                return true
            } else if (this.options.showSelectionBarEnd) {
              if (value >= this.lowValue) return true
            } else if (this.options.showSelectionBar && value <= this.lowValue)
              return true
          }
          if (this.range && value >= this.lowValue && value <= this.highValue)
            return true
          return false
        },

        /**
       * Update position of the floor label
       *
       * @returns {undefined}
       */
        updateFloorLab: function() {
          this.translateFn(this.minValue, this.flrLab, 'floor')
          this.getDimension(this.flrLab)
          var position = this.options.rightToLeft
            ? this.barDimension - this.flrLab.rzsd
            : 0
          this.setPosition(this.flrLab, position)
        },

        /**
       * Update position of the ceiling label
       *
       * @returns {undefined}
       */
        updateCeilLab: function() {
          this.translateFn(this.maxValue, this.ceilLab, 'ceil')
          this.getDimension(this.ceilLab)
          var position = this.options.rightToLeft
            ? 0
            : this.barDimension - this.ceilLab.rzsd
          this.setPosition(this.ceilLab, position)
        },

        /**
       * Update slider handles and label positions
       *
       * @param {string} which
       * @param {number} newPos
       */
        updateHandles: function(which, newPos) {
          if (which === 'lowValue') this.updateLowHandle(newPos)
          else this.updateHighHandle(newPos)

          this.updateSelectionBar()
          this.updateTicksScale()
          if (this.range) this.updateCmbLabel()
        },

        /**
       * Helper function to work out the position for handle labels depending on RTL or not
       *
       * @param {string} labelName maxLab or minLab
       * @param newPos
       *
       * @returns {number}
       */
        getHandleLabelPos: function(labelName, newPos) {
          var labelRzsd = this[labelName].rzsd,
            nearHandlePos = newPos - labelRzsd / 2 + this.handleHalfDim,
            endOfBarPos = this.barDimension - labelRzsd

          if (!this.options.boundPointerLabels) return nearHandlePos

          if (
            (this.options.rightToLeft && labelName === 'minLab') ||
            (!this.options.rightToLeft && labelName === 'maxLab')
          ) {
            return Math.min(nearHandlePos, endOfBarPos)
          } else {
            return Math.min(Math.max(nearHandlePos, 0), endOfBarPos)
          }
        },

        /**
       * Update low slider handle position and label
       *
       * @param {number} newPos
       * @returns {undefined}
       */
        updateLowHandle: function(newPos) {
          this.setPosition(this.minH, newPos)
          this.translateFn(this.lowValue, this.minLab, 'model')
          this.setPosition(
            this.minLab,
            this.getHandleLabelPos('minLab', newPos)
          )

          if (this.options.getPointerColor) {
            var pointercolor = this.getPointerColor('min')
            this.scope.minPointerStyle = {
              backgroundColor: pointercolor
            }
          }

          if (this.options.autoHideLimitLabels) {
            this.shFloorCeil()
          }
        },

        /**
       * Update high slider handle position and label
       *
       * @param {number} newPos
       * @returns {undefined}
       */
        updateHighHandle: function(newPos) {
          this.setPosition(this.maxH, newPos)
          this.translateFn(this.highValue, this.maxLab, 'high')
          this.setPosition(
            this.maxLab,
            this.getHandleLabelPos('maxLab', newPos)
          )

          if (this.options.getPointerColor) {
            var pointercolor = this.getPointerColor('max')
            this.scope.maxPointerStyle = {
              backgroundColor: pointercolor
            }
          }
          if (this.options.autoHideLimitLabels) {
            this.shFloorCeil()
          }
        },

        /**
       * Show/hide floor/ceiling label
       *
       * @returns {undefined}
       */
        shFloorCeil: function() {
          // Show based only on hideLimitLabels if pointer labels are hidden
          if (this.options.hidePointerLabels) {
            return
          }
          var flHidden = false,
            clHidden = false,
            isMinLabAtFloor = this.isLabelBelowFloorLab(this.minLab),
            isMinLabAtCeil = this.isLabelAboveCeilLab(this.minLab),
            isMaxLabAtCeil = this.isLabelAboveCeilLab(this.maxLab),
            isCmbLabAtFloor = this.isLabelBelowFloorLab(this.cmbLab),
            isCmbLabAtCeil = this.isLabelAboveCeilLab(this.cmbLab)

          if (isMinLabAtFloor) {
            flHidden = true
            this.hideEl(this.flrLab)
          } else {
            flHidden = false
            this.showEl(this.flrLab)
          }

          if (isMinLabAtCeil) {
            clHidden = true
            this.hideEl(this.ceilLab)
          } else {
            clHidden = false
            this.showEl(this.ceilLab)
          }

          if (this.range) {
            var hideCeil = this.cmbLabelShown ? isCmbLabAtCeil : isMaxLabAtCeil
            var hideFloor = this.cmbLabelShown
              ? isCmbLabAtFloor
              : isMinLabAtFloor

            if (hideCeil) {
              this.hideEl(this.ceilLab)
            } else if (!clHidden) {
              this.showEl(this.ceilLab)
            }

            // Hide or show floor label
            if (hideFloor) {
              this.hideEl(this.flrLab)
            } else if (!flHidden) {
              this.showEl(this.flrLab)
            }
          }
        },

        isLabelBelowFloorLab: function(label) {
          var isRTL = this.options.rightToLeft,
            pos = label.rzsp,
            dim = label.rzsd,
            floorPos = this.flrLab.rzsp,
            floorDim = this.flrLab.rzsd
          return isRTL
            ? pos + dim >= floorPos - 2
            : pos <= floorPos + floorDim + 2
        },

        isLabelAboveCeilLab: function(label) {
          var isRTL = this.options.rightToLeft,
            pos = label.rzsp,
            dim = label.rzsd,
            ceilPos = this.ceilLab.rzsp,
            ceilDim = this.ceilLab.rzsd
          return isRTL ? pos <= ceilPos + ceilDim + 2 : pos + dim >= ceilPos - 2
        },

        /**
       * Update slider selection bar, combined label and range label
       *
       * @returns {undefined}
       */
        updateSelectionBar: function() {
          var position = 0,
            dimension = 0,
            isSelectionBarFromRight = this.options.rightToLeft
              ? !this.options.showSelectionBarEnd
              : this.options.showSelectionBarEnd,
            positionForRange = this.options.rightToLeft
              ? this.maxH.rzsp + this.handleHalfDim
              : this.minH.rzsp + this.handleHalfDim

          if (this.range) {
            dimension = Math.abs(this.maxH.rzsp - this.minH.rzsp)
            position = positionForRange
          } else {
            if (this.options.showSelectionBarFromValue !== null) {
              var center = this.options.showSelectionBarFromValue,
                centerPosition = this.valueToPosition(center),
                isModelGreaterThanCenter = this.options.rightToLeft
                  ? this.lowValue <= center
                  : this.lowValue > center
              if (isModelGreaterThanCenter) {
                dimension = this.minH.rzsp - centerPosition
                position = centerPosition + this.handleHalfDim
              } else {
                dimension = centerPosition - this.minH.rzsp
                position = this.minH.rzsp + this.handleHalfDim
              }
            } else if (isSelectionBarFromRight) {
              dimension =
                Math.abs(this.maxPos - this.minH.rzsp) + this.handleHalfDim
              position = this.minH.rzsp + this.handleHalfDim
            } else {
              dimension = this.minH.rzsp + this.handleHalfDim
              position = 0
            }
          }
          this.setDimension(this.selBar, dimension)
          this.setPosition(this.selBar, position)
          if (this.range && this.options.showOuterSelectionBars) {
            if (this.options.rightToLeft) {
              this.setDimension(this.rightOutSelBar, position)
              this.setPosition(this.rightOutSelBar, 0)
              this.setDimension(
                this.leftOutSelBar,
                this.getDimension(this.fullBar) - (position + dimension)
              )
              this.setPosition(this.leftOutSelBar, position + dimension)
            } else {
              this.setDimension(this.leftOutSelBar, position)
              this.setPosition(this.leftOutSelBar, 0)
              this.setDimension(
                this.rightOutSelBar,
                this.getDimension(this.fullBar) - (position + dimension)
              )
              this.setPosition(this.rightOutSelBar, position + dimension)
            }
          }
          if (this.options.getSelectionBarColor) {
            var color = this.getSelectionBarColor()
            this.scope.barStyle = {
              backgroundColor: color
            }
          } else if (this.options.selectionBarGradient) {
            var offset =
                this.options.showSelectionBarFromValue !== null
                  ? this.valueToPosition(this.options.showSelectionBarFromValue)
                  : 0,
              reversed = (offset - position > 0) ^ isSelectionBarFromRight,
              direction = this.options.vertical
                ? reversed ? 'bottom' : 'top'
                : reversed ? 'left' : 'right'
            this.scope.barStyle = {
              backgroundImage:
                'linear-gradient(to ' +
                direction +
                ', ' +
                this.options.selectionBarGradient.from +
                ' 0%,' +
                this.options.selectionBarGradient.to +
                ' 100%)'
            }
            if (this.options.vertical) {
              this.scope.barStyle.backgroundPosition =
                'center ' +
                (offset +
                  dimension +
                  position +
                  (reversed ? -this.handleHalfDim : 0)) +
                'px'
              this.scope.barStyle.backgroundSize =
                '100% ' + (this.barDimension - this.handleHalfDim) + 'px'
            } else {
              this.scope.barStyle.backgroundPosition =
                offset -
                position +
                (reversed ? this.handleHalfDim : 0) +
                'px center'
              this.scope.barStyle.backgroundSize =
                this.barDimension - this.handleHalfDim + 'px 100%'
            }
          }
        },

        /**
       * Wrapper around the getSelectionBarColor of the user to pass to
       * correct parameters
       */
        getSelectionBarColor: function() {
          if (this.range)
            return this.options.getSelectionBarColor(
              this.scope.rzSliderModel,
              this.scope.rzSliderHigh
            )
          return this.options.getSelectionBarColor(this.scope.rzSliderModel)
        },

        /**
       * Wrapper around the getPointerColor of the user to pass to
       * correct parameters
       */
        getPointerColor: function(pointerType) {
          if (pointerType === 'max') {
            return this.options.getPointerColor(
              this.scope.rzSliderHigh,
              pointerType
            )
          }
          return this.options.getPointerColor(
            this.scope.rzSliderModel,
            pointerType
          )
        },

        /**
       * Wrapper around the getTickColor of the user to pass to
       * correct parameters
       */
        getTickColor: function(value) {
          return this.options.getTickColor(value)
        },

        /**
       * Update combined label position and value
       *
       * @returns {undefined}
       */
        updateCmbLabel: function() {
          var isLabelOverlap = null
          if (this.options.rightToLeft) {
            isLabelOverlap =
              this.minLab.rzsp - this.minLab.rzsd - 10 <= this.maxLab.rzsp
          } else {
            isLabelOverlap =
              this.minLab.rzsp + this.minLab.rzsd + 10 >= this.maxLab.rzsp
          }

          if (isLabelOverlap) {
            var lowTr = this.getDisplayValue(this.lowValue, 'model'),
              highTr = this.getDisplayValue(this.highValue, 'high'),
              labelVal = ''
            if (this.options.mergeRangeLabelsIfSame && lowTr === highTr) {
              labelVal = lowTr
            } else {
              labelVal = this.options.rightToLeft
                ? highTr + ' - ' + lowTr
                : lowTr + ' - ' + highTr
            }

            this.translateFn(labelVal, this.cmbLab, 'cmb', false)
            var pos = this.options.boundPointerLabels
              ? Math.min(
                  Math.max(
                    this.selBar.rzsp +
                      this.selBar.rzsd / 2 -
                      this.cmbLab.rzsd / 2,
                    0
                  ),
                  this.barDimension - this.cmbLab.rzsd
                )
              : this.selBar.rzsp + this.selBar.rzsd / 2 - this.cmbLab.rzsd / 2

            this.setPosition(this.cmbLab, pos)
            this.cmbLabelShown = true
            this.hideEl(this.minLab)
            this.hideEl(this.maxLab)
            this.showEl(this.cmbLab)
          } else {
            this.cmbLabelShown = false
            this.updateHighHandle(this.valueToPosition(this.highValue))
            this.updateLowHandle(this.valueToPosition(this.lowValue))
            this.showEl(this.maxLab)
            this.showEl(this.minLab)
            this.hideEl(this.cmbLab)
          }
          if (this.options.autoHideLimitLabels) {
            this.shFloorCeil()
          }
        },

        /**
       * Return the translated value if a translate function is provided else the original value
       * @param value
       * @param which if it's min or max handle
       * @returns {*}
       */
        getDisplayValue: function(value, which) {
          if (this.options.stepsArray && !this.options.bindIndexForStepsArray) {
            value = this.getStepValue(value)
          }
          return this.customTrFn(value, this.options.id, which)
        },

        /**
       * Round value to step and precision based on minValue
       *
       * @param {number} value
       * @param {number} customStep a custom step to override the defined step
       * @returns {number}
       */
        roundStep: function(value, customStep) {
          var step = customStep ? customStep : this.step,
            steppedDifference = parseFloat(
              (value - this.minValue) / step
            ).toPrecision(12)
          steppedDifference = Math.round(+steppedDifference) * step
          var newValue = (this.minValue + steppedDifference).toFixed(
            this.precision
          )
          return +newValue
        },

        /**
       * Hide element
       *
       * @param element
       * @returns {jqLite} The jqLite wrapped DOM element
       */
        hideEl: function(element) {
          return element.css({
            visibility: 'hidden'
          })
        },

        /**
       * Show element
       *
       * @param element The jqLite wrapped DOM element
       * @returns {jqLite} The jqLite
       */
        showEl: function(element) {
          if (!!element.rzAlwaysHide) {
            return element
          }

          return element.css({
            visibility: 'visible'
          })
        },

        /**
       * Set element left/top position depending on whether slider is horizontal or vertical
       *
       * @param {jqLite} elem The jqLite wrapped DOM element
       * @param {number} pos
       * @returns {number}
       */
        setPosition: function(elem, pos) {
          elem.rzsp = pos
          var css = {}
          css[this.positionProperty] = Math.round(pos) + 'px'
          elem.css(css)
          return pos
        },

        /**
       * Get element width/height depending on whether slider is horizontal or vertical
       *
       * @param {jqLite} elem The jqLite wrapped DOM element
       * @returns {number}
       */
        getDimension: function(elem) {
          var val = elem[0].getBoundingClientRect()
          if (this.options.vertical)
            elem.rzsd = (val.bottom - val.top) * this.options.scale
          else elem.rzsd = (val.right - val.left) * this.options.scale
          return elem.rzsd
        },

        /**
       * Set element width/height depending on whether slider is horizontal or vertical
       *
       * @param {jqLite} elem  The jqLite wrapped DOM element
       * @param {number} dim
       * @returns {number}
       */
        setDimension: function(elem, dim) {
          elem.rzsd = dim
          var css = {}
          css[this.dimensionProperty] = Math.round(dim) + 'px'
          elem.css(css)
          return dim
        },

        /**
       * Returns a value that is within slider range
       *
       * @param {number} val
       * @returns {number}
       */
        sanitizeValue: function(val) {
          return Math.min(Math.max(val, this.minValue), this.maxValue)
        },

        /**
       * Translate value to pixel position
       *
       * @param {number} val
       * @returns {number}
       */
        valueToPosition: function(val) {
          var fn = this.linearValueToPosition
          if (this.options.customValueToPosition)
            fn = this.options.customValueToPosition
          else if (this.options.logScale) fn = this.logValueToPosition

          val = this.sanitizeValue(val)
          var percent = fn(val, this.minValue, this.maxValue) || 0
          if (this.options.rightToLeft) percent = 1 - percent
          return percent * this.maxPos
        },

        linearValueToPosition: function(val, minVal, maxVal) {
          var range = maxVal - minVal
          return (val - minVal) / range
        },

        logValueToPosition: function(val, minVal, maxVal) {
          val = Math.log(val)
          minVal = Math.log(minVal)
          maxVal = Math.log(maxVal)
          var range = maxVal - minVal
          return (val - minVal) / range
        },

        /**
       * Translate position to model value
       *
       * @param {number} position
       * @returns {number}
       */
        positionToValue: function(position) {
          var percent = position / this.maxPos
          if (this.options.rightToLeft) percent = 1 - percent
          var fn = this.linearPositionToValue
          if (this.options.customPositionToValue)
            fn = this.options.customPositionToValue
          else if (this.options.logScale) fn = this.logPositionToValue
          return fn(percent, this.minValue, this.maxValue) || 0
        },

        linearPositionToValue: function(percent, minVal, maxVal) {
          return percent * (maxVal - minVal) + minVal
        },

        logPositionToValue: function(percent, minVal, maxVal) {
          minVal = Math.log(minVal)
          maxVal = Math.log(maxVal)
          var value = percent * (maxVal - minVal) + minVal
          return Math.exp(value)
        },

        getEventAttr: function(event, attr) {
          return event.originalEvent === undefined
            ? event[attr]
            : event.originalEvent[attr]
        },

        // Events
        /**
       * Get the X-coordinate or Y-coordinate of an event
       *
       * @param {Object} event  The event
       * @param targetTouchId The identifier of the touch with the X/Y coordinates
       * @returns {number}
       */
        getEventXY: function(event, targetTouchId) {
          /* http://stackoverflow.com/a/12336075/282882 */
          //noinspection JSLint
          var clientXY = this.options.vertical ? 'clientY' : 'clientX'
          if (event[clientXY] !== undefined) {
            return event[clientXY]
          }

          var touches = this.getEventAttr(event, 'touches')

          if (targetTouchId !== undefined) {
            for (var i = 0; i < touches.length; i++) {
              if (touches[i].identifier === targetTouchId) {
                return touches[i][clientXY]
              }
            }
          }

          // If no target touch or the target touch was not found in the event
          // returns the coordinates of the first touch
          return touches[0][clientXY]
        },

        /**
       * Compute the event position depending on whether the slider is horizontal or vertical
       * @param event
       * @param targetTouchId If targetTouchId is provided it will be considered the position of that
       * @returns {number}
       */
        getEventPosition: function(event, targetTouchId) {
          var sliderPos = this.sliderElem.rzsp,
            eventPos = 0
          if (this.options.vertical)
            eventPos = -this.getEventXY(event, targetTouchId) + sliderPos
          else eventPos = this.getEventXY(event, targetTouchId) - sliderPos
          return eventPos * this.options.scale - this.handleHalfDim // #346 handleHalfDim is already scaled
        },

        /**
       * Get event names for move and event end
       *
       * @param {Event}    event    The event
       *
       * @return {{moveEvent: string, endEvent: string}}
       */
        getEventNames: function(event) {
          var eventNames = {
            moveEvent: '',
            endEvent: ''
          }

          if (this.getEventAttr(event, 'touches')) {
            eventNames.moveEvent = 'touchmove'
            eventNames.endEvent = 'touchend'
          } else {
            eventNames.moveEvent = 'mousemove'
            eventNames.endEvent = 'mouseup'
          }

          return eventNames
        },

        /**
       * Get the handle closest to an event.
       *
       * @param event {Event} The event
       * @returns {jqLite} The handle closest to the event.
       */
        getNearestHandle: function(event) {
          if (!this.range) {
            return this.minH
          }
          var position = this.getEventPosition(event),
            distanceMin = Math.abs(position - this.minH.rzsp),
            distanceMax = Math.abs(position - this.maxH.rzsp)
          if (distanceMin < distanceMax) return this.minH
          else if (distanceMin > distanceMax) return this.maxH
          else if (!this.options.rightToLeft)
            //if event is at the same distance from min/max then if it's at left of minH, we return minH else maxH
            return position < this.minH.rzsp ? this.minH : this.maxH
          else
            //reverse in rtl
            return position > this.minH.rzsp ? this.minH : this.maxH
        },

        /**
       * Wrapper function to focus an angular element
       *
       * @param el {AngularElement} the element to focus
       */
        focusElement: function(el) {
          var DOM_ELEMENT = 0
          el[DOM_ELEMENT].focus()
        },

        /**
       * Bind mouse and touch events to slider handles
       *
       * @returns {undefined}
       */
        bindEvents: function() {
          var barTracking, barStart, barMove

          if (this.options.draggableRange) {
            barTracking = 'rzSliderDrag'
            barStart = this.onDragStart
            barMove = this.onDragMove
          } else {
            barTracking = 'lowValue'
            barStart = this.onStart
            barMove = this.onMove
          }

          if (!this.options.onlyBindHandles) {
            this.selBar.on(
              'mousedown',
              angular.bind(this, barStart, null, barTracking)
            )
            this.selBar.on(
              'mousedown',
              angular.bind(this, barMove, this.selBar)
            )
          }

          if (this.options.draggableRangeOnly) {
            this.minH.on(
              'mousedown',
              angular.bind(this, barStart, null, barTracking)
            )
            this.maxH.on(
              'mousedown',
              angular.bind(this, barStart, null, barTracking)
            )
          } else {
            this.minH.on(
              'mousedown',
              angular.bind(this, this.onStart, this.minH, 'lowValue')
            )
            if (this.range) {
              this.maxH.on(
                'mousedown',
                angular.bind(this, this.onStart, this.maxH, 'highValue')
              )
            }
            if (!this.options.onlyBindHandles) {
              this.fullBar.on(
                'mousedown',
                angular.bind(this, this.onStart, null, null)
              )
              this.fullBar.on(
                'mousedown',
                angular.bind(this, this.onMove, this.fullBar)
              )
              this.ticks.on(
                'mousedown',
                angular.bind(this, this.onStart, null, null)
              )
              this.ticks.on(
                'mousedown',
                angular.bind(this, this.onTickClick, this.ticks)
              )
            }
          }

          if (!this.options.onlyBindHandles) {
            this.selBar.on(
              'touchstart',
              angular.bind(this, barStart, null, barTracking)
            )
            this.selBar.on(
              'touchstart',
              angular.bind(this, barMove, this.selBar)
            )
          }
          if (this.options.draggableRangeOnly) {
            this.minH.on(
              'touchstart',
              angular.bind(this, barStart, null, barTracking)
            )
            this.maxH.on(
              'touchstart',
              angular.bind(this, barStart, null, barTracking)
            )
          } else {
            this.minH.on(
              'touchstart',
              angular.bind(this, this.onStart, this.minH, 'lowValue')
            )
            if (this.range) {
              this.maxH.on(
                'touchstart',
                angular.bind(this, this.onStart, this.maxH, 'highValue')
              )
            }
            if (!this.options.onlyBindHandles) {
              this.fullBar.on(
                'touchstart',
                angular.bind(this, this.onStart, null, null)
              )
              this.fullBar.on(
                'touchstart',
                angular.bind(this, this.onMove, this.fullBar)
              )
              this.ticks.on(
                'touchstart',
                angular.bind(this, this.onStart, null, null)
              )
              this.ticks.on(
                'touchstart',
                angular.bind(this, this.onTickClick, this.ticks)
              )
            }
          }

          if (this.options.keyboardSupport) {
            this.minH.on(
              'focus',
              angular.bind(this, this.onPointerFocus, this.minH, 'lowValue')
            )
            if (this.range) {
              this.maxH.on(
                'focus',
                angular.bind(this, this.onPointerFocus, this.maxH, 'highValue')
              )
            }
          }
        },

        /**
       * Unbind mouse and touch events to slider handles
       *
       * @returns {undefined}
       */
        unbindEvents: function() {
          this.minH.off()
          this.maxH.off()
          this.fullBar.off()
          this.selBar.off()
          this.ticks.off()
        },

        /**
       * onStart event handler
       *
       * @param {?Object} pointer The jqLite wrapped DOM element; if null, the closest handle is used
       * @param {?string} ref     The name of the handle being changed; if null, the closest handle's value is modified
       * @param {Event}   event   The event
       * @returns {undefined}
       */
        onStart: function(pointer, ref, event) {
          var ehMove,
            ehEnd,
            eventNames = this.getEventNames(event)

          event.stopPropagation()
          event.preventDefault()

          // We have to do this in case the HTML where the sliders are on
          // have been animated into view.
          this.calcViewDimensions()

          if (pointer) {
            this.tracking = ref
          } else {
            pointer = this.getNearestHandle(event)
            this.tracking = pointer === this.minH ? 'lowValue' : 'highValue'
          }

          pointer.addClass('rz-active')

          if (this.options.keyboardSupport) this.focusElement(pointer)

          ehMove = angular.bind(
            this,
            this.dragging.active ? this.onDragMove : this.onMove,
            pointer
          )
          ehEnd = angular.bind(this, this.onEnd, ehMove)

          $document.on(eventNames.moveEvent, ehMove)
          $document.on(eventNames.endEvent, ehEnd)
          this.endHandlerToBeRemovedOnEnd = ehEnd

          this.callOnStart()

          var changedTouches = this.getEventAttr(event, 'changedTouches')
          if (changedTouches) {
            // Store the touch identifier
            if (!this.touchId) {
              this.isDragging = true
              this.touchId = changedTouches[0].identifier
            }
          }
        },

        /**
       * onMove event handler
       *
       * @param {jqLite} pointer
       * @param {Event}  event The event
       * @param {boolean}  fromTick if the event occured on a tick or not
       * @returns {undefined}
       */
        onMove: function(pointer, event, fromTick) {
          var changedTouches = this.getEventAttr(event, 'changedTouches')
          var touchForThisSlider
          if (changedTouches) {
            for (var i = 0; i < changedTouches.length; i++) {
              if (changedTouches[i].identifier === this.touchId) {
                touchForThisSlider = changedTouches[i]
                break
              }
            }
          }

          if (changedTouches && !touchForThisSlider) {
            return
          }

          var newPos = this.getEventPosition(
              event,
              touchForThisSlider ? touchForThisSlider.identifier : undefined
            ),
            newValue,
            ceilValue = this.options.rightToLeft
              ? this.minValue
              : this.maxValue,
            flrValue = this.options.rightToLeft ? this.maxValue : this.minValue

          if (newPos <= 0) {
            newValue = flrValue
          } else if (newPos >= this.maxPos) {
            newValue = ceilValue
          } else {
            newValue = this.positionToValue(newPos)
            if (fromTick && angular.isNumber(this.options.showTicks))
              newValue = this.roundStep(newValue, this.options.showTicks)
            else newValue = this.roundStep(newValue)
          }
          this.positionTrackingHandle(newValue)
        },

        /**
       * onEnd event handler
       *
       * @param {Event}    event    The event
       * @param {Function} ehMove   The bound move event handler
       * @returns {undefined}
       */
        onEnd: function(ehMove, event) {
          var changedTouches = this.getEventAttr(event, 'changedTouches')
          if (changedTouches && changedTouches[0].identifier !== this.touchId) {
            return
          }
          this.isDragging = false
          this.touchId = null

          if (!this.options.keyboardSupport) {
            this.minH.removeClass('rz-active')
            this.maxH.removeClass('rz-active')
            this.tracking = ''
          }
          this.dragging.active = false

          var eventName = this.getEventNames(event)
          $document.off(eventName.moveEvent, ehMove)
          $document.off(eventName.endEvent, this.endHandlerToBeRemovedOnEnd)
          this.endHandlerToBeRemovedOnEnd = null
          this.callOnEnd()
        },

        onTickClick: function(pointer, event) {
          this.onMove(pointer, event, true)
        },

        onPointerFocus: function(pointer, ref) {
          this.tracking = ref
          pointer.one('blur', angular.bind(this, this.onPointerBlur, pointer))
          pointer.on('keydown', angular.bind(this, this.onKeyboardEvent))
          pointer.on('keyup', angular.bind(this, this.onKeyUp))
          this.firstKeyDown = true
          pointer.addClass('rz-active')

          this.currentFocusElement = {
            pointer: pointer,
            ref: ref
          }
        },

        onKeyUp: function() {
          this.firstKeyDown = true
          this.callOnEnd()
        },

        onPointerBlur: function(pointer) {
          pointer.off('keydown')
          pointer.off('keyup')
          pointer.removeClass('rz-active')
          if (!this.isDragging) {
            this.tracking = ''
            this.currentFocusElement = null
          }
        },

        /**
       * Key actions helper function
       *
       * @param {number} currentValue value of the slider
       *
       * @returns {?Object} action value mappings
       */
        getKeyActions: function(currentValue) {
          var increaseStep = currentValue + this.step,
            decreaseStep = currentValue - this.step,
            increasePage = currentValue + this.valueRange / 10,
            decreasePage = currentValue - this.valueRange / 10

          if (this.options.reversedControls) {
            increaseStep = currentValue - this.step
            decreaseStep = currentValue + this.step
            increasePage = currentValue - this.valueRange / 10
            decreasePage = currentValue + this.valueRange / 10
          }

          //Left to right default actions
          var actions = {
            UP: increaseStep,
            DOWN: decreaseStep,
            LEFT: decreaseStep,
            RIGHT: increaseStep,
            PAGEUP: increasePage,
            PAGEDOWN: decreasePage,
            HOME: this.options.reversedControls ? this.maxValue : this.minValue,
            END: this.options.reversedControls ? this.minValue : this.maxValue
          }
          //right to left means swapping right and left arrows
          if (this.options.rightToLeft) {
            actions.LEFT = increaseStep
            actions.RIGHT = decreaseStep
            // right to left and vertical means we also swap up and down
            if (this.options.vertical) {
              actions.UP = decreaseStep
              actions.DOWN = increaseStep
            }
          }
          return actions
        },

        onKeyboardEvent: function(event) {
          var currentValue = this[this.tracking],
            keyCode = event.keyCode || event.which,
            keys = {
              38: 'UP',
              40: 'DOWN',
              37: 'LEFT',
              39: 'RIGHT',
              33: 'PAGEUP',
              34: 'PAGEDOWN',
              36: 'HOME',
              35: 'END'
            },
            actions = this.getKeyActions(currentValue),
            key = keys[keyCode],
            action = actions[key]
          if (action == null || this.tracking === '') return
          event.preventDefault()

          if (this.firstKeyDown) {
            this.firstKeyDown = false
            this.callOnStart()
          }

          var self = this
          $timeout(function() {
            var newValue = self.roundStep(self.sanitizeValue(action))
            if (!self.options.draggableRangeOnly) {
              self.positionTrackingHandle(newValue)
            } else {
              var difference = self.highValue - self.lowValue,
                newMinValue,
                newMaxValue
              if (self.tracking === 'lowValue') {
                newMinValue = newValue
                newMaxValue = newValue + difference
                if (newMaxValue > self.maxValue) {
                  newMaxValue = self.maxValue
                  newMinValue = newMaxValue - difference
                }
              } else {
                newMaxValue = newValue
                newMinValue = newValue - difference
                if (newMinValue < self.minValue) {
                  newMinValue = self.minValue
                  newMaxValue = newMinValue + difference
                }
              }
              self.positionTrackingBar(newMinValue, newMaxValue)
            }
          })
        },

        /**
       * onDragStart event handler
       *
       * Handles dragging of the middle bar.
       *
       * @param {Object} pointer The jqLite wrapped DOM element
       * @param {string} ref     One of the refLow, refHigh values
       * @param {Event}  event   The event
       * @returns {undefined}
       */
        onDragStart: function(pointer, ref, event) {
          var position = this.getEventPosition(event)
          this.dragging = {
            active: true,
            value: this.positionToValue(position),
            difference: this.highValue - this.lowValue,
            lowLimit: this.options.rightToLeft
              ? this.minH.rzsp - position
              : position - this.minH.rzsp,
            highLimit: this.options.rightToLeft
              ? position - this.maxH.rzsp
              : this.maxH.rzsp - position
          }

          this.onStart(pointer, ref, event)
        },

        /**
       * getValue helper function
       *
       * gets max or min value depending on whether the newPos is outOfBounds above or below the bar and rightToLeft
       *
       * @param {string} type 'max' || 'min' The value we are calculating
       * @param {number} newPos  The new position
       * @param {boolean} outOfBounds Is the new position above or below the max/min?
       * @param {boolean} isAbove Is the new position above the bar if out of bounds?
       *
       * @returns {number}
       */
        getValue: function(type, newPos, outOfBounds, isAbove) {
          var isRTL = this.options.rightToLeft,
            value = null

          if (type === 'min') {
            if (outOfBounds) {
              if (isAbove) {
                value = isRTL
                  ? this.minValue
                  : this.maxValue - this.dragging.difference
              } else {
                value = isRTL
                  ? this.maxValue - this.dragging.difference
                  : this.minValue
              }
            } else {
              value = isRTL
                ? this.positionToValue(newPos + this.dragging.lowLimit)
                : this.positionToValue(newPos - this.dragging.lowLimit)
            }
          } else {
            if (outOfBounds) {
              if (isAbove) {
                value = isRTL
                  ? this.minValue + this.dragging.difference
                  : this.maxValue
              } else {
                value = isRTL
                  ? this.maxValue
                  : this.minValue + this.dragging.difference
              }
            } else {
              if (isRTL) {
                value =
                  this.positionToValue(newPos + this.dragging.lowLimit) +
                  this.dragging.difference
              } else {
                value =
                  this.positionToValue(newPos - this.dragging.lowLimit) +
                  this.dragging.difference
              }
            }
          }
          return this.roundStep(value)
        },

        /**
       * onDragMove event handler
       *
       * Handles dragging of the middle bar.
       *
       * @param {jqLite} pointer
       * @param {Event}  event The event
       * @returns {undefined}
       */
        onDragMove: function(pointer, event) {
          var newPos = this.getEventPosition(event),
            newMinValue,
            newMaxValue,
            ceilLimit,
            flrLimit,
            isUnderFlrLimit,
            isOverCeilLimit,
            flrH,
            ceilH

          if (this.options.rightToLeft) {
            ceilLimit = this.dragging.lowLimit
            flrLimit = this.dragging.highLimit
            flrH = this.maxH
            ceilH = this.minH
          } else {
            ceilLimit = this.dragging.highLimit
            flrLimit = this.dragging.lowLimit
            flrH = this.minH
            ceilH = this.maxH
          }
          isUnderFlrLimit = newPos <= flrLimit
          isOverCeilLimit = newPos >= this.maxPos - ceilLimit

          if (isUnderFlrLimit) {
            if (flrH.rzsp === 0) return
            newMinValue = this.getValue('min', newPos, true, false)
            newMaxValue = this.getValue('max', newPos, true, false)
          } else if (isOverCeilLimit) {
            if (ceilH.rzsp === this.maxPos) return
            newMaxValue = this.getValue('max', newPos, true, true)
            newMinValue = this.getValue('min', newPos, true, true)
          } else {
            newMinValue = this.getValue('min', newPos, false)
            newMaxValue = this.getValue('max', newPos, false)
          }
          this.positionTrackingBar(newMinValue, newMaxValue)
        },

        /**
       * Set the new value and position for the entire bar
       *
       * @param {number} newMinValue   the new minimum value
       * @param {number} newMaxValue   the new maximum value
       */
        positionTrackingBar: function(newMinValue, newMaxValue) {
          if (
            this.options.minLimit != null &&
            newMinValue < this.options.minLimit
          ) {
            newMinValue = this.options.minLimit
            newMaxValue = newMinValue + this.dragging.difference
          }
          if (
            this.options.maxLimit != null &&
            newMaxValue > this.options.maxLimit
          ) {
            newMaxValue = this.options.maxLimit
            newMinValue = newMaxValue - this.dragging.difference
          }

          this.lowValue = newMinValue
          this.highValue = newMaxValue
          this.applyLowValue()
          if (this.range) this.applyHighValue()
          this.applyModel(true)
          this.updateHandles('lowValue', this.valueToPosition(newMinValue))
          this.updateHandles('highValue', this.valueToPosition(newMaxValue))
        },

        /**
       * Set the new value and position to the current tracking handle
       *
       * @param {number} newValue new model value
       */
        positionTrackingHandle: function(newValue) {
          var valueChanged = false
          newValue = this.applyMinMaxLimit(newValue)
          if (this.range) {
            if (this.options.pushRange) {
              newValue = this.applyPushRange(newValue)
              valueChanged = true
            } else {
              if (this.options.noSwitching) {
                if (this.tracking === 'lowValue' && newValue > this.highValue)
                  newValue = this.applyMinMaxRange(this.highValue)
                else if (
                  this.tracking === 'highValue' &&
                  newValue < this.lowValue
                )
                  newValue = this.applyMinMaxRange(this.lowValue)
              }
              newValue = this.applyMinMaxRange(newValue)
              /* This is to check if we need to switch the min and max handles */
              if (this.tracking === 'lowValue' && newValue > this.highValue) {
                this.lowValue = this.highValue
                this.applyLowValue()
                this.applyModel()
                this.updateHandles(this.tracking, this.maxH.rzsp)
                this.updateAriaAttributes()
                this.tracking = 'highValue'
                this.minH.removeClass('rz-active')
                this.maxH.addClass('rz-active')
                if (this.options.keyboardSupport) this.focusElement(this.maxH)
                valueChanged = true
              } else if (
                this.tracking === 'highValue' &&
                newValue < this.lowValue
              ) {
                this.highValue = this.lowValue
                this.applyHighValue()
                this.applyModel()
                this.updateHandles(this.tracking, this.minH.rzsp)
                this.updateAriaAttributes()
                this.tracking = 'lowValue'
                this.maxH.removeClass('rz-active')
                this.minH.addClass('rz-active')
                if (this.options.keyboardSupport) this.focusElement(this.minH)
                valueChanged = true
              }
            }
          }

          if (this[this.tracking] !== newValue) {
            this[this.tracking] = newValue
            if (this.tracking === 'lowValue') this.applyLowValue()
            else this.applyHighValue()
            this.applyModel()
            this.updateHandles(this.tracking, this.valueToPosition(newValue))
            this.updateAriaAttributes()
            valueChanged = true
          }

          if (valueChanged) this.applyModel(true)
        },

        applyMinMaxLimit: function(newValue) {
          if (this.options.minLimit != null && newValue < this.options.minLimit)
            return this.options.minLimit
          if (this.options.maxLimit != null && newValue > this.options.maxLimit)
            return this.options.maxLimit
          return newValue
        },

        applyMinMaxRange: function(newValue) {
          var oppositeValue =
              this.tracking === 'lowValue' ? this.highValue : this.lowValue,
            difference = Math.abs(newValue - oppositeValue)
          if (this.options.minRange != null) {
            if (difference < this.options.minRange) {
              if (this.tracking === 'lowValue')
                return this.highValue - this.options.minRange
              else return this.lowValue + this.options.minRange
            }
          }
          if (this.options.maxRange != null) {
            if (difference > this.options.maxRange) {
              if (this.tracking === 'lowValue')
                return this.highValue - this.options.maxRange
              else return this.lowValue + this.options.maxRange
            }
          }
          return newValue
        },

        applyPushRange: function(newValue) {
          var difference =
              this.tracking === 'lowValue'
                ? this.highValue - newValue
                : newValue - this.lowValue,
            minRange =
              this.options.minRange !== null
                ? this.options.minRange
                : this.options.step,
            maxRange = this.options.maxRange
          // if smaller than minRange
          if (difference < minRange) {
            if (this.tracking === 'lowValue') {
              this.highValue = Math.min(newValue + minRange, this.maxValue)
              newValue = this.highValue - minRange
              this.applyHighValue()
              this.updateHandles(
                'highValue',
                this.valueToPosition(this.highValue)
              )
            } else {
              this.lowValue = Math.max(newValue - minRange, this.minValue)
              newValue = this.lowValue + minRange
              this.applyLowValue()
              this.updateHandles(
                'lowValue',
                this.valueToPosition(this.lowValue)
              )
            }
            this.updateAriaAttributes()
          } else if (maxRange !== null && difference > maxRange) {
            // if greater than maxRange
            if (this.tracking === 'lowValue') {
              this.highValue = newValue + maxRange
              this.applyHighValue()
              this.updateHandles(
                'highValue',
                this.valueToPosition(this.highValue)
              )
            } else {
              this.lowValue = newValue - maxRange
              this.applyLowValue()
              this.updateHandles(
                'lowValue',
                this.valueToPosition(this.lowValue)
              )
            }
            this.updateAriaAttributes()
          }
          return newValue
        },

        /**
       * Apply the model values using scope.$apply.
       * We wrap it with the internalChange flag to avoid the watchers to be called
       */
        applyModel: function(callOnChange) {
          this.internalChange = true
          this.scope.$apply()
          callOnChange && this.callOnChange()
          this.internalChange = false
        },

        /**
       * Call the onStart callback if defined
       * The callback call is wrapped in a $evalAsync to ensure that its result will be applied to the scope.
       *
       * @returns {undefined}
       */
        callOnStart: function() {
          if (this.options.onStart) {
            var self = this,
              pointerType = this.tracking === 'lowValue' ? 'min' : 'max'
            this.scope.$evalAsync(function() {
              self.options.onStart(
                self.options.id,
                self.scope.rzSliderModel,
                self.scope.rzSliderHigh,
                pointerType
              )
            })
          }
        },

        /**
       * Call the onChange callback if defined
       * The callback call is wrapped in a $evalAsync to ensure that its result will be applied to the scope.
       *
       * @returns {undefined}
       */
        callOnChange: function() {
          if (this.options.onChange) {
            var self = this,
              pointerType = this.tracking === 'lowValue' ? 'min' : 'max'
            this.scope.$evalAsync(function() {
              self.options.onChange(
                self.options.id,
                self.scope.rzSliderModel,
                self.scope.rzSliderHigh,
                pointerType
              )
            })
          }
        },

        /**
       * Call the onEnd callback if defined
       * The callback call is wrapped in a $evalAsync to ensure that its result will be applied to the scope.
       *
       * @returns {undefined}
       */
        callOnEnd: function() {
          if (this.options.onEnd) {
            var self = this,
              pointerType = this.tracking === 'lowValue' ? 'min' : 'max'
            this.scope.$evalAsync(function() {
              self.options.onEnd(
                self.options.id,
                self.scope.rzSliderModel,
                self.scope.rzSliderHigh,
                pointerType
              )
            })
          }
          this.scope.$emit('slideEnded')
        }
      }

      return Slider
    }])
    .directive('rzslider', ['RzSlider', function(RzSlider) {
      'use strict'

      return {
        restrict: 'AE',
        replace: true,
        scope: {
          rzSliderModel: '=?',
          rzSliderHigh: '=?',
          rzSliderOptions: '&?',
          rzSliderTplUrl: '@'
        },

        /**
       * Return template URL
       *
       * @param {jqLite} elem
       * @param {Object} attrs
       * @return {string}
       */
        templateUrl: function(elem, attrs) {
          //noinspection JSUnresolvedVariable
          return attrs.rzSliderTplUrl || 'rzSliderTpl.html'
        },

        link: function(scope, elem) {
          scope.slider = new RzSlider(scope, elem) //attach on scope so we can test it
        }
      }
    }])

  // IDE assist

  /**
   * @name ngScope
   *
   * @property {number} rzSliderModel
   * @property {number} rzSliderHigh
   * @property {Object} rzSliderOptions
   */

  /**
   * @name jqLite
   *
   * @property {number|undefined} rzsp rzslider label position position
   * @property {number|undefined} rzsd rzslider element dimension
   * @property {string|undefined} rzsv rzslider label value/text
   * @property {Function} css
   * @property {Function} text
   */

  /**
   * @name Event
   * @property {Array} touches
   * @property {Event} originalEvent
   */

  /**
   * @name ThrottleOptions
   *
   * @property {boolean} leading
   * @property {boolean} trailing
   */

  module.run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('rzSliderTpl.html',
    "<div class=rzslider><span class=\"rz-bar-wrapper rz-left-out-selection\"><span class=rz-bar></span></span> <span class=\"rz-bar-wrapper rz-right-out-selection\"><span class=rz-bar></span></span> <span class=rz-bar-wrapper><span class=rz-bar></span></span> <span class=rz-bar-wrapper><span class=\"rz-bar rz-selection\" ng-style=barStyle></span></span> <span class=\"rz-pointer rz-pointer-min\" ng-style=minPointerStyle></span> <span class=\"rz-pointer rz-pointer-max\" ng-style=maxPointerStyle></span> <span class=\"rz-bubble rz-limit rz-floor\"></span> <span class=\"rz-bubble rz-limit rz-ceil\"></span> <span class=\"rz-bubble rz-model-value\"></span> <span class=\"rz-bubble rz-model-high\"></span> <span class=rz-bubble></span><ul ng-show=showTicks class=rz-ticks><li ng-repeat=\"t in ticks track by $index\" class=rz-tick ng-class=\"{'rz-selected': t.selected}\" ng-style=t.style ng-attr-uib-tooltip=\"{{ t.tooltip }}\" ng-attr-tooltip-placement={{t.tooltipPlacement}} ng-attr-tooltip-append-to-body=\"{{ t.tooltip ? true : undefined}}\"><span ng-if=\"t.value != null\" class=rz-tick-value ng-attr-uib-tooltip=\"{{ t.valueTooltip }}\" ng-attr-tooltip-placement={{t.valueTooltipPlacement}}>{{ t.value }}</span> <span ng-if=\"t.legend != null\" class=rz-tick-legend>{{ t.legend }}</span></li></ul></div>"
  );

}]);

  return module.name
})
;
// EXCEL TO JSON
// download spreadsheet as csv, then use this tool http://www.csvjson.com/csv2json
// then, var arr = ...
//
// var arrClean = arr.map(function(i){
//     return {
//         img: i.img,
//         min: i.min,
//         max: i.max,
//         name: i.name,
//         tags: i.tags.split(',').map(function(ii){
//             return ii.trim();
//         })
//     }
//
// })
//
// console.log(JSON.stringify(arrClean));

// var freq = {}
// arrClean.map(function(ii){
//     if (ii.tags)
//         ii.tags.map(function(i){
//             freq[i] = freq[i] || 0;
//             freq[i] ++;
//         });
// });
// var keysSorted = Object.keys(freq).sort(function(a,b){return freq[b]-freq[a]});
// console.log(keysSorted.map(function(k){return k + ':' + freq[k]}))
// console.log(JSON.stringify(keysSorted.map(function(i){
//  return {name: i, show: true}
// })));


var DATA = {};
var b = 'https://images-na.ssl-images-amazon.com/images/I/';
DATA.categories =
    [{"name":"home","show":true},{"name":"gadgets","show":true},{"name":"toys","show":true},{"name":"kitchen","show":true},{"name":"decoration","show":true},{"name":"sports","show":true},{"name":"fashion","show":true},{"name":"art","show":true},{"name":"games","show":true},{"name":"outdoors","show":true},{"name":"music","show":true},{"name":"tools","show":true},{"name":"photography","show":true},{"name":"tech","show":true},{"name":"travel","show":true},{"name":"health","show":true},{"name":"beauty","show":true},{"name":"office","show":true},{"name":"pc","show":true},{"name":"books","show":true},{"name":"garden","show":true},{"name":"auto","show":true},{"name":"cycling","show":true},{"name":"painting","show":true},{"name":"grocery","show":true},{"name":"eco","show":true},{"name":"pets","show":true},{"name":"diy","show":true},{"name":"fishing","show":true},{"name":"creative","show":true}];
DATA.gifts =
    [{"img":"https://images-na.ssl-images-amazon.com/images/I/41kl3yxDuQL._SL160_.jpg","min":23,"max":120,"name":"Ukulele","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31LXFKv6FVL._SL160_.jpg","min":25,"max":410,"name":"Graphics Tablet","tags":["pc","art","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51BTyX5gjIL._SL160_.jpg","min":13,"max":70,"name":"Novelty Alarm Clock","tags":["gadgets","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41pntXpFYOL._SL160_.jpg","min":1,"max":30,"name":"Personalised Phone Case","tags":["gadgets","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/419-HJYP80L._SL160_.jpg","min":14,"max":140,"name":"Radio Control Helicopter","tags":["gadgets","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/519NmEUlFVL._SL160_.jpg","min":46,"max":94,"name":"USB Roll Up Drum Kit","tags":["pc","gadgets","music","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61Uag5rZwPL._SL160_.jpg","min":0,"max":150,"name":"Photo Software","tags":["pc","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/410VqKRbVxL._SL160_.jpg","min":28,"max":130,"name":"Rucksack","tags":["travel","outdoors","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/412vJUAIbsL._SL160_.jpg","min":15,"max":72,"name":"Multi-tool Pliers","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41GwVBMkBJL._SL160_.jpg","min":12,"max":79,"name":"Fishing Chair","tags":["sports","fishing"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41FLc1iTGuL._SL160_.jpg","min":7,"max":60,"name":"Mood Light","tags":["tech","gadgets","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/412bFdQUKDL._SL160_.jpg","min":10,"max":70,"name":"Plasma Ball","tags":["tech","gadgets","home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tYbDZQnJL._SL160_.jpg","min":17,"max":100,"name":"Fitness Tracker","tags":["gadgets","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51tJ4to5AXL._SL160_.jpg","min":13,"max":270,"name":"Power Kite","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51hba2O5%2B%2BL._SL160_.jpg","min":11,"max":180,"name":"Solar Marker Lights","tags":["home","eco","garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41UULwDIGnL._SL160_.jpg","min":12,"max":78,"name":"Music Stand","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41XIhXg4X0L._SL160_.jpg","min":9,"max":93,"name":"Easel","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51L5EEkUpgL._SL160_.jpg","min":10,"max":36,"name":"Oil Paints Set","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41D6UAXcTML._SL160_.jpg","min":16,"max":290,"name":"Guitar Effects Pedal","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41sih-xvvSL._SL160_.jpg","min":20,"max":130,"name":"Remote Control Plane","tags":["tech","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41mirjX5txL._SL160_.jpg","min":12,"max":150,"name":"Waterproof Jacket","tags":["sports","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/412WF-j1l8L._SL160_.jpg","min":8,"max":82,"name":"Foam Sleeping Mat","tags":["outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41IYOzScuSL._SL160_.jpg","min":9,"max":90,"name":"Fishing Net","tags":["sports","fishing"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41nSmAmNtDL._SL160_.jpg","min":3,"max":55,"name":"Recycled Glasses","tags":["home","eco"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51G%2BORuJZsL._SL160_.jpg","min":3,"max":89,"name":"Personalised Poster","tags":["art","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51fIJViOPqL._SL160_.jpg","min":10,"max":250,"name":"Car Winter Emergency Kit","tags":["tech","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41c79B3iKGL._SL160_.jpg","min":15,"max":100,"name":"Multi Grooming Kit","tags":["gadgets","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tTxINn3TL._SL160_.jpg","min":5,"max":110,"name":"Fitness Equipment","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41q8Wt5EfEL._SL160_.jpg","min":10,"max":30,"name":"Tent Light","tags":["gadgets","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41yfWs-u9IL._SL160_.jpg","min":25,"max":200,"name":"Binoculars","tags":["gadgets","outdoors","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31KCk1RqNEL._SL160_.jpg","min":8,"max":80,"name":"Potting Shed Gift Set","tags":["art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51JNIYVG12L._SL160_.jpg","min":18,"max":70,"name":"Head Torch","tags":["tech","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51G8bqpXncL._SL160_.jpg","min":3,"max":54,"name":"Fishing Bite Alarm","tags":["sports","fishing","tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41qWiIleTDL._SL160_.jpg","min":12,"max":64,"name":"Swiss Army Knife","tags":["tools","home","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41A3-o5e4wL._SL160_.jpg","min":14,"max":100,"name":"Garden Tools Set","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Wyi7xHxKL._SL160_.jpg","min":9,"max":90,"name":"Camping Equipment","tags":["outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41SuS%2BGYmBL._SL160_.jpg","min":12,"max":49,"name":"Fishing Stool","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41yRL7xw7JL._SL160_.jpg","min":3,"max":60,"name":"Musical Instrument","tags":["art","music","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Kfnkb8xIL._SL160_.jpg","min":29,"max":100,"name":"USB Roll Up Piano","tags":["art","music","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/416Tlwn7yzL._SL160_.jpg","min":20,"max":390,"name":"Synthesizer","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31NJ4xTC4mL._SL160_.jpg","min":25,"max":70,"name":"Didgeridoo","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51%2Bt7iAWX3L._SL160_.jpg","min":16,"max":160,"name":"Heated Gloves","tags":["fashion","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51NdRKUW3gL._SL160_.jpg","min":15,"max":50,"name":"Beard Grooming Kit","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41u57t8CSYL._SL160_.jpg","min":3,"max":34,"name":"Aftershave","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41xayW68qgL._SL160_.jpg","min":15,"max":79,"name":"Photo Jigsaw","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Ghfw4OujL._SL160_.jpg","min":5,"max":20,"name":"Graphic Novel","tags":["books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41FrnTBS1lL._SL160_.jpg","min":13,"max":160,"name":"Video Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41fBj2ZVfcL._SL160_.jpg","min":5,"max":50,"name":"Bicycle Cover","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41bO1Vxh4jL._SL160_.jpg","min":12,"max":63,"name":"Garden Kneeler","tags":["home","garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/417xu1bZrOL._SL160_.jpg","min":5,"max":22,"name":"Gloves","tags":["fashion","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31zSpXFHZeL._SL160_.jpg","min":10,"max":40,"name":"Onesie","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ehBkq7xyL._SL160_.jpg","min":22,"max":79,"name":"Mens Character Robe","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51MmVoOVfDL._SL160_.jpg","min":5,"max":100,"name":"Art Brushes","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61AiT2P2-GL._SL160_.jpg","min":35,"max":250,"name":"Guitar Amplifier","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51LqQJKnocL._SL160_.jpg","min":5,"max":26,"name":"Polo Shirt","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51h%2B2i%2B6TzL._SL160_.jpg","min":9,"max":29,"name":"Cycling Gloves","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41CyjnlI7zL._SL160_.jpg","min":8,"max":36,"name":"Belt","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51w95Cg6avL._SL160_.jpg","min":10,"max":70,"name":"Formal Shirt","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51uF1bI0emL._SL160_.jpg","min":16,"max":50,"name":"Beard Trimmer","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tGk3PFXfL._SL160_.jpg","min":4,"max":26,"name":"Bicycle Lock","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51CSf--NHBL._SL160_.jpg","min":16,"max":60,"name":"Sleeping Bag","tags":["outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41iF6vMbMZL._SL160_.jpg","min":7,"max":60,"name":"Gorillapod Camera Tripod","tags":["gadgets","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51fR%2Bh9%2BprL._SL160_.jpg","min":22,"max":130,"name":"Virtual Reality Headset","tags":["games","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41fEnrMNvbL._SL160_.jpg","min":19,"max":70,"name":"Micro Drone","tags":["tech","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41QDmJ93nwL._SL160_.jpg","min":9,"max":46,"name":"Watercolour Paints","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51M1soUzITL._SL160_.jpg","min":15,"max":120,"name":"Batik a T-shirt","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51TFrk91lnL._SL160_.jpg","min":5,"max":15,"name":"Magnetic List Pad","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51FkvapB0YL._SL160_.jpg","min":5,"max":50,"name":"Paint Roller & Tray Set","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51vzA7bEPkL._SL160_.jpg","min":5,"max":17,"name":"Diary","tags":["home","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/518WVpVw6DL._SL160_.jpg","min":9,"max":30,"name":"Wooden Sculpture Kit","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51%2BxA8yoK3L._SL160_.jpg","min":3,"max":50,"name":"Art Pencils","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51jg-O9AH6L._SL160_.jpg","min":3,"max":10,"name":"Notepad","tags":["home","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51zdWxeQzBL._SL160_.jpg","min":5,"max":18,"name":"Address Book","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/4120b8jKZ3L._SL160_.jpg","min":3,"max":70,"name":"Whistle Key Finder","tags":["home","tech"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51V0VeUn6ZL._SL160_.jpg","min":3,"max":19,"name":"Emoji Page Markers","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61S%2BJ447sAL._SL160_.jpg","min":10,"max":73,"name":"Desk Tidy","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31Gv8B3DAyL._SL160_.jpg","min":9,"max":26,"name":"Box of Chocolates","tags":["home","grocery"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51%2BxA8yoK3L._SL160_.jpg","min":6,"max":25,"name":"Sketch Pad & Pencils","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41hZakPR7hL._SL160_.jpg","min":6,"max":43,"name":"Reading Light","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41p-w8o-UfL._SL160_.jpg","min":5,"max":24,"name":"Oil Painting Spatula Knives","tags":["art","painting"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51%2Bkw%2BpEBuL._SL160_.jpg","min":2,"max":14,"name":"Novelty Playing Cards","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51GZ5SnjVIL._SL160_.jpg","min":6,"max":38,"name":"Scented Candle","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51I3l83tPlL._SL160_.jpg","min":1,"max":24,"name":"Highlighter Pens","tags":["office","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51kcL5cG86L._SL160_.jpg","min":1,"max":29,"name":"Make a Friendship Bracelet","tags":["toys","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41SmitQC5kL._SL160_.jpg","min":2,"max":13,"name":"Yo-Yo","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51-RbD-wO2L._SL160_.jpg","min":10,"max":54,"name":"Novelty Solar Ornament","tags":["decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41l%2BG3nzTZL._SL160_.jpg","min":5,"max":20,"name":"Bath Soak","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31AH3n%2B2E2L._SL160_.jpg","min":6,"max":31,"name":"Shower Gel","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51zTxFRV4RL._SL160_.jpg","min":3,"max":17,"name":"Novelty Fridge Magnet","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51uKuOyfRxL._SL160_.jpg","min":2,"max":54,"name":"Stress Ball","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51SXGofftBL._SL160_.jpg","min":9,"max":26,"name":"Bike Spoke Lights","tags":["cycling","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ktdfjUDoL._SL160_.jpg","min":4,"max":20,"name":"Juggling Balls","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41MIiyz1%2BoL._SL160_.jpg","min":3,"max":28,"name":"Oil burner","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51l4qdV0vEL._SL160_.jpg","min":3,"max":34,"name":"Dictionary","tags":["books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41RWEfPSKQL._SL160_.jpg","min":2,"max":25,"name":"Tape Measure","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/510OQ0tZMIL._SL160_.jpg","min":10,"max":40,"name":"Tea Selection","tags":["grocery"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51tlqWOzE1L._SL160_.jpg","min":2,"max":10,"name":"Puzzle Book","tags":["books","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61xp0qmhDZL._SL160_.jpg","min":6,"max":30,"name":"Fake Tattoos","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31tc6-Bld0L._SL160_.jpg","min":11,"max":45,"name":"Cooking Torch","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/5149dYUr7rL._SL160_.jpg","min":5,"max":34,"name":"Brain Teaser Puzzle","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41mC5qsj89L._SL160_.jpg","min":1,"max":10,"name":"Head Massager","tags":["health","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41D8qyBP49L._SL160_.jpg","min":3,"max":20,"name":"Novelty Bottle Opener","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51gx05eKUIL._SL160_.jpg","min":11,"max":30,"name":"Gingerbread House Kit","tags":["toys","decoration","grocery"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61x8hIV-FXL._SL160_.jpg","min":10,"max":20,"name":"Aromatherapy Oils","tags":["health","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61DVuOud4-L._SL160_.jpg","min":7,"max":40,"name":"Crystal Growing Kit","tags":["toys","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51DqZ0-wOaL._SL160_.jpg","min":8,"max":40,"name":"Balloon Modelling Kit","tags":["toys","art","creative"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31MNOkmorBL._SL160_.jpg","min":7,"max":26,"name":"Haircare Products","tags":["beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51wGc0XSMuL._SL160_.jpg","min":12,"max":80,"name":"Gym Bag","tags":["travel","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41AibAL2eRL._SL160_.jpg","min":2,"max":20,"name":"Fidget Cube","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51tud2sDa0L._SL160_.jpg","min":5,"max":35,"name":"Trivia Game","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/614U8Vfp8vL._SL160_.jpg","min":6,"max":65,"name":"Door Mat","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/510-EuTIR9L._SL160_.jpg","min":6,"max":50,"name":"Car Winter Kit","tags":["auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41LOI6i-3DL._SL160_.jpg","min":10,"max":100,"name":"Bug Zapper","tags":["home","garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51ZCb6H6aGL._SL160_.jpg","min":8,"max":25,"name":"Folding Step Stool","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/519njRmurDL._SL160_.jpg","min":5,"max":60,"name":"Camera Holster Belt Clip","tags":["sports","outdoors","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41U4W3H1XjL._SL160_.jpg","min":20,"max":60,"name":"LED Candle(s)","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51zPMBGKMKL._SL160_.jpg","min":4,"max":43,"name":"Energy Saving Book","tags":["home","eco","books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/618ClfLjaxL._SL160_.jpg","min":6,"max":16,"name":"Origami Kit","tags":["toys","books","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Zwn6js3qL._SL160_.jpg","min":18,"max":40,"name":"Pedometer","tags":["sports","outdoors","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ESdCXNXcL._SL160_.jpg","min":4,"max":35,"name":"Novelty Mug","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61e7vy7DCGL._SL160_.jpg","min":2,"max":8,"name":"Mindfulness Colouring Book","tags":["books","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31MojK5edxL._SL160_.jpg","min":8,"max":36,"name":"Personalised Mug","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ZjeaVTtkL._SL160_.jpg","min":6,"max":120,"name":"Engraved Glass","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61VdidMvbiL._SL160_.jpg","min":8,"max":17,"name":"Jigsaw Puzzle","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51R-vORuJeL._SL160_.jpg","min":2,"max":130,"name":"Pastels","tags":["art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51trTEDt8tL._SL160_.jpg","min":14,"max":75,"name":"Hiking Socks","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41hyi8ehS0L._SL160_.jpg","min":3,"max":140,"name":"LED Smartphone Flash","tags":["gadgets","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tzeh9HJmL._SL160_.jpg","min":23,"max":110,"name":"Kitchen Knives Set","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41YkoPsMIiL._SL160_.jpg","min":13,"max":95,"name":"Melting Clock","tags":["home","decoration","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51dkp5izgfL._SL160_.jpg","min":2,"max":35,"name":"Story Cubes Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Dh24SUnpL._SL160_.jpg","min":11,"max":26,"name":"Novelty Apron","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51fQ6HaGPoL._SL160_.jpg","min":11,"max":70,"name":"Novelty Clock","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41QeXwgR64L._SL160_.jpg","min":6,"max":70,"name":"Selfie Stick","tags":["gadgets","travel","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51IZzfczhiL._SL160_.jpg","min":13,"max":100,"name":"Phone Juice Booster","tags":["gadgets","travel"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41FcJCorlFL._SL160_.jpg","min":7,"max":25,"name":"USB Mug Warmer","tags":["gadgets","home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41-qjEMFkCL._SL160_.jpg","min":5,"max":30,"name":"Bicycle Mirror","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31KnW7NjZRL._SL160_.jpg","min":9,"max":50,"name":"Bedside Lamp","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41bKBfAl3ML._SL160_.jpg","min":6,"max":69,"name":"Hot Glue Gun","tags":["tools","home","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/512w-PYKx8L._SL160_.jpg","min":6,"max":16,"name":"Memory Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41D6SuOqRWL._SL160_.jpg","min":9,"max":35,"name":"Personalised T-shirt","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/418y1hrirHL._SL160_.jpg","min":13,"max":570,"name":"Mobile Phone","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/518t0F2yQnL._SL160_.jpg","min":10,"max":37,"name":"Photo Album","tags":["home","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41KdS7ofvrL._SL160_.jpg","min":17,"max":150,"name":"Set of Mugs","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51AtxERH20L._SL160_.jpg","min":10,"max":130,"name":"Globe of the Earth","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51JlOzvyhVL._SL160_.jpg","min":12,"max":72,"name":"Addictaball Maze","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/6148TfdBmOL._SL160_.jpg","min":1,"max":25,"name":"Board Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31hB5S6MnIL._SL160_.jpg","min":21,"max":100,"name":"Wok","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51yH5PfL90L._SL160_.jpg","min":18,"max":26,"name":"Bath Bombs / Melts","tags":["beauty","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/516vVNV5bvL._SL160_.jpg","min":9,"max":37,"name":"Disco Party Bulb","tags":["decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31oJ2fD3b8L._SL160_.jpg","min":17,"max":60,"name":"Vacuum Flask","tags":["kitchen","travel"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51NdNa64YgL._SL160_.jpg","min":7,"max":120,"name":"Jenga","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41rS5TnVKTL._SL160_.jpg","min":21,"max":540,"name":"Espresso Maker","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41YbIacxXeL._SL160_.jpg","min":14,"max":46,"name":"Door Chime / Bell","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51rRWteBkFL._SL160_.jpg","min":6,"max":60,"name":"Camera Case","tags":["travel","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61ifouBC5lL._SL160_.jpg","min":5,"max":38,"name":"Road Atlas","tags":["travel","books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41MeZX7z5BL._SL160_.jpg","min":10,"max":100,"name":"Candle Lanterns","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41eGvtABGeL._SL160_.jpg","min":15,"max":54,"name":"Cookie Jar","tags":["kitchen","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41l7OZH2YmL._SL160_.jpg","min":12,"max":120,"name":"Shower Radio","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41dB15IOBwL._SL160_.jpg","min":7,"max":120,"name":"Milk Frother","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51dztLpUBmL._SL160_.jpg","min":5,"max":56,"name":"Wine Bottle Lock","tags":["kitchen","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51tMIauJYtL._SL160_.jpg","min":5,"max":100,"name":"Headphones","tags":["gadgets","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51-rR6Ib3aL._SL160_.jpg","min":8,"max":120,"name":"Novelty Shot Glasses","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61-xIXmQZPL._SL160_.jpg","min":14,"max":390,"name":"Table Tennis Set","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41yFKCODcEL._SL160_.jpg","min":13,"max":87,"name":"Baking Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Zp0GMT2ML._SL160_.jpg","min":9,"max":25,"name":"Dream Catcher","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51qd6F%2BECuL._SL160_.jpg","min":7,"max":40,"name":"Novelty Tea Towel","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/613K%2BML2ZTL._SL160_.jpg","min":5,"max":82,"name":"Wildlife Photo Book","tags":["books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/313BJt2fsZL._SL160_.jpg","min":8,"max":53,"name":"Toiletries Bag","tags":["home",""]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51ycZSq90-L._SL160_.jpg","min":7,"max":24,"name":"Coin Counting Money Jar","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41cKXrSIZJL._SL160_.jpg","min":3,"max":50,"name":"Sky Lanterns","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31QGscPvkGL._SL160_.jpg","min":4,"max":51,"name":"Spider Catcher","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51zOqOIrUfL._SL160_.jpg","min":5,"max":200,"name":"Watch","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/511FZukAGyL._SL160_.jpg","min":8,"max":25,"name":"Emoji Plush","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41hFzRBkoDL._SL160_.jpg","min":16,"max":66,"name":"Smartphone Camera Lens","tags":["travel","photography","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31WdHf9TWVL._SL160_.jpg","min":12,"max":100,"name":"Security Light","tags":["home","garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41M-ddIqHTL._SL160_.jpg","min":6,"max":24,"name":"Guitar Tuner","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51iZud1oAnL._SL160_.jpg","min":14,"max":79,"name":"3D Model Puzzle","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31aIQV6Hg2L._SL160_.jpg","min":8,"max":50,"name":"Bicycle Pump","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41eGDy10mtL._SL160_.jpg","min":10,"max":78,"name":"Spiralizer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31RRIw1ntiL._SL160_.jpg","min":20,"max":100,"name":"Espresso Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/516FTpPGWNL._SL160_.jpg","min":3,"max":110,"name":"Sports Racket","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/414xpQjuMBL._SL160_.jpg","min":9,"max":40,"name":"Collapsible Strainer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51sWkWUBqIL._SL160_.jpg","min":10,"max":47,"name":"Garlic Press","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31DoqdDZ6DL._SL160_.jpg","min":3,"max":260,"name":"Tray","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Q3-Wp1DmL._SL160_.jpg","min":4,"max":100,"name":"Chopping Board","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41a1U-0hOQL._SL160_.jpg","min":6,"max":67,"name":"Pen Set","tags":["office","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61isG%2B2iNOL._SL160_.jpg","min":3,"max":60,"name":"Aquarium Accessories","tags":["pets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Oc1CP9Q2L._SL160_.jpg","min":30,"max":110,"name":"House Name Sign","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51YcJ%2Bz4vCL._SL160_.jpg","min":4,"max":30,"name":"Sudokube","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41C9Y4JeMZL._SL160_.jpg","min":10,"max":30,"name":"Garden Caddy","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/4146NGVrJzL._SL160_.jpg","min":12,"max":100,"name":"Camera / Camcorder Tripod","tags":["travel","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61EMPXQjjaL._SL160_.jpg","min":11,"max":60,"name":"Laptop Sleeve","tags":["travel","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51wfRsYLNaL._SL160_.jpg","min":9,"max":80,"name":"Photo Frame","tags":["home","decoration","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41DkwCsY6eL._SL160_.jpg","min":9,"max":40,"name":"Kitchen Scales","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51zG0Yj7MQL._SL160_.jpg","min":3,"max":20,"name":"Giant Playing Cards","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41z4piM6TWL._SL160_.jpg","min":3,"max":28,"name":"USB Memory Stick","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51f682vxhZL._SL160_.jpg","min":12,"max":48,"name":"Eco-Friendly Shopping Bag","tags":["eco","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Lhrw32zeL._SL160_.jpg","min":13,"max":57,"name":"Chocolate Board Game","tags":["games","grocery"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/414s0cAabWL._SL160_.jpg","min":5,"max":30,"name":"One 4 All Remote Control","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61jA2xUMSjL._SL160_.jpg","min":23,"max":46,"name":"Flowers","tags":["decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/319jhKEUmlL._SL160_.jpg","min":3,"max":35,"name":"Glasses","tags":["health","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41lCxeX8N2L._SL160_.jpg","min":20,"max":130,"name":"iTunes Gift Card","tags":["music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51p2reVhOiL._SL160_.jpg","min":9,"max":220,"name":"A Blu-Ray Film","tags":["art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tOc6vATXL._SL160_.jpg","min":10,"max":59,"name":"Rainbow Lamp","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51eMz6h1iJL._SL160_.jpg","min":10,"max":30,"name":"Adult Board Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/518RPtEpZ3L._SL160_.jpg","min":2,"max":29,"name":"Grow Your Own Bonsai Tree","tags":["home","office","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Su7A1tBML._SL160_.jpg","min":5,"max":50,"name":"Car Boot Tidy","tags":["auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31JC4XYqkmL._SL160_.jpg","min":4,"max":20,"name":"Dimmer Switch","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41s2sPf8suL._SL160_.jpg","min":2,"max":110,"name":"Pen","tags":["office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61crFyIQgIL._SL160_.jpg","min":9,"max":30,"name":"Football Scarf","tags":["fashion","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51lnNsvK2uL._SL160_.jpg","min":9,"max":40,"name":"Handheld Electronic Game","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51rnCITnozL._SL160_.jpg","min":13,"max":60,"name":"Flight Pillow","tags":["travel","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51N433FjBXL._SL160_.jpg","min":15,"max":70,"name":"Vegetable Slicer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41SZlWmNinL._SL160_.jpg","min":2,"max":20,"name":"Kitchen Timer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51aYg%2BzQePL._SL160_.jpg","min":10,"max":60,"name":"Kitchen Utensils Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41zbft-8rjL._SL160_.jpg","min":3,"max":40,"name":"Food Thermometer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31TpF9IeZJL._SL160_.jpg","min":13,"max":110,"name":"Wind Chime","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Eo5WTEeML._SL160_.jpg","min":8,"max":80,"name":"First Aid Kit","tags":["travel","auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51U4V6rjNCL._SL160_.jpg","min":11,"max":36,"name":"Headphone Hat","tags":["fashion","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41wUzbaz%2BGL._SL160_.jpg","min":5,"max":250,"name":"HexBug Robot Insect","tags":["toys","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31fMOeYF74L._SL160_.jpg","min":9,"max":41,"name":"USB Glitter Lamp","tags":["home","decoration","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31WnqmqyKIL._SL160_.jpg","min":16,"max":60,"name":"Table Lamp","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/510FufEaL6L._SL160_.jpg","min":7,"max":80,"name":"Windscreen Cover","tags":["auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41iReu9ClLL._SL160_.jpg","min":4,"max":21,"name":"Scientific Calculator","tags":["office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/5175PTRqwmL._SL160_.jpg","min":3,"max":60,"name":"Modelling Clay","tags":["art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/418g4e8tqvL._SL160_.jpg","min":2,"max":19,"name":"Watering Can","tags":["garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51rNcH4QpIL._SL160_.jpg","min":8,"max":90,"name":"Magnetic Darts Set","tags":["toys","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/416YkMw6LGL._SL160_.jpg","min":5,"max":140,"name":"Martial Arts Equipment","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51OBsU%2BY9AL._SL160_.jpg","min":12,"max":50,"name":"Umbrella","tags":["travel"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41MX%2BvN%2BxCL._SL160_.jpg","min":15,"max":90,"name":"Bathroom Scales","tags":["home","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/413h3T3m59L._SL160_.jpg","min":20,"max":50,"name":"Slanket","tags":["fashion","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51BBV8udDdL._SL160_.jpg","min":10,"max":260,"name":"Dumbbells","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61R3dU%2BUfUL._SL160_.jpg","min":7,"max":30,"name":"Planter","tags":["home","decoration","garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/415qrRRJENL._SL160_.jpg","min":12,"max":45,"name":"Gaming Mouse","tags":["gadgets","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51SrXU9QDgL._SL160_.jpg","min":26,"max":250,"name":"Foot Massager","tags":["home","beauty","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41JdMdErl7L._SL160_.jpg","min":8,"max":100,"name":"PC Speakers","tags":["home","gadgets","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51IYn9GscOL._SL160_.jpg","min":7,"max":71,"name":"Dominoes","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51BIuX7F4%2BL._SL160_.jpg","min":7,"max":40,"name":"Make Your Own Neon Sign","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61U%2BIGIoiyL._SL160_.jpg","min":19,"max":50,"name":"Travellers Scratch Map","tags":["home","travel","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ufN98vW9L._SL160_.jpg","min":33,"max":200,"name":"Wall Sculpture","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41huptWfprL._SL160_.jpg","min":15,"max":180,"name":"Ice Crusher","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41XVsb46GlL._SL160_.jpg","min":15,"max":42,"name":"Laughing Chuckle Buddy","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51x7AzHsxmL._SL160_.jpg","min":30,"max":80,"name":"Bar Set","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51PTah5zC1L._SL160_.jpg","min":16,"max":70,"name":"Popcorn Maker","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41MqRpogx5L._SL160_.jpg","min":7,"max":140,"name":"Home Telephone","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41yAg-6H95L._SL160_.jpg","min":10,"max":50,"name":"Car Seat Covers","tags":["auto","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41hFgLSJWKL._SL160_.jpg","min":15,"max":40,"name":"Wireless Mouse & Keyboard","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51lw9kwkXdL._SL160_.jpg","min":8,"max":99,"name":"Inflatable Novelty Chair","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41VSsV5qmSL._SL160_.jpg","min":20,"max":50,"name":"Remote Control Sockets","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41H8Jl4hkLL._SL160_.jpg","min":15,"max":110,"name":"Portable Heater","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41NYiIB61hL._SL160_.jpg","min":15,"max":170,"name":"Bean Bag","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61ptYgu8pVL._SL160_.jpg","min":10,"max":120,"name":"Wall Mural","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51tKRj0i%2BkL._SL160_.jpg","min":11,"max":210,"name":"Cycling Computer","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/21pG7FU2CNL._SL160_.jpg","min":18,"max":120,"name":"Floor Standing Lamp","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41xh5EuXBKL._SL160_.jpg","min":20,"max":80,"name":"Snow Boots","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51evb7Pp2lL._SL160_.jpg","min":55,"max":480,"name":"Camera","tags":["travel","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41uuxjbDCiL._SL160_.jpg","min":13,"max":50,"name":"Tracksuit","tags":["fashion","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Dx9aXS7qL._SL160_.jpg","min":17,"max":170,"name":"Wireless Headphones","tags":["gadgets","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41A9DxXm3wL._SL160_.jpg","min":20,"max":82,"name":"Handheld Vacuum Cleaner","tags":["home","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41CV4SdCBlL._SL160_.jpg","min":10,"max":35,"name":"Jogging Bottoms","tags":["fashion","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51v8NJCSUNL._SL160_.jpg","min":17,"max":60,"name":"Gaming Headset","tags":["gadgets","music","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31ARo7jH7HL._SL160_.jpg","min":21,"max":200,"name":"Air Bed","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51FvQ%2BOY2tL._SL160_.jpg","min":15,"max":100,"name":"Cycling Helmet","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41v2ZXVI4RL._SL160_.jpg","min":12,"max":80,"name":"Duvet Cover","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41BRtH6tjyL._SL160_.jpg","min":11,"max":80,"name":"Chocolate Fountain","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51jmmfw1gcL._SL160_.jpg","min":40,"max":190,"name":"Digital Photo Frame","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tIB1q7SML._SL160_.jpg","min":16,"max":150,"name":"Weather Vane","tags":["home","garden","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51UhTjUe-IL._SL160_.jpg","min":10,"max":58,"name":"PC Game","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/5111vVE9FgL._SL160_.jpg","min":15,"max":170,"name":"Waterproof Bluetooth Speaker","tags":["outdoors","travel","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41itoq39U3L._SL160_.jpg","min":9,"max":46,"name":"Tool Bag","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31hnpfizj5L._SL160_.jpg","min":30,"max":220,"name":"Wireless Network Range Extender","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51XeUO27OEL._SL160_.jpg","min":16,"max":97,"name":"Tool Kit","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41JF6hXcctL._SL160_.jpg","min":20,"max":130,"name":"Hiking Poles","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51-x7uoDotL._SL160_.jpg","min":12,"max":250,"name":"Snow Goggles","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51jCvCzV%2B1L._SL160_.jpg","min":14,"max":100,"name":"Wine Aerator","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51ASXYHmsHL._SL160_.jpg","min":41,"max":96,"name":"Inline Skates","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41wLzB0%2BUAL._SL160_.jpg","min":30,"max":93,"name":"TILE - Item Tracker","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51TFnR7AtGL._SL160_.jpg","min":30,"max":230,"name":"Amazon Echo","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51RuAYaxePL._SL160_.jpg","min":30,"max":150,"name":"Karaoke Machine","tags":["gadgets","art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41OFOmgpngL._SL160_.jpg","min":13,"max":140,"name":"Punch Bag","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/4185DHx9bRL._SL160_.jpg","min":24,"max":100,"name":"Deep Fat Fryer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41XNwto1ESL._SL160_.jpg","min":37,"max":160,"name":"Action Camera","tags":["outdoors","travel","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31wRkA40C%2BL._SL160_.jpg","min":18,"max":110,"name":"Electric Toothbrush","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41LngE1A5VL._SL160_.jpg","min":45,"max":200,"name":"Office Chair","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41uRP-2FBVL._SL160_.jpg","min":32,"max":110,"name":"Bar Stools","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51B92sd-n1L._SL160_.jpg","min":15,"max":300,"name":"Aquarium","tags":["home","pets","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/511PadqAGuL._SL160_.jpg","min":11,"max":39,"name":"Terrarium","tags":["home","pets","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/417HujpM%2B2L._SL160_.jpg","min":26,"max":200,"name":"Telescope","tags":["gadgets","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/415f7ZQ8cVL._SL160_.jpg","min":29,"max":420,"name":"Scanner","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51-kUtaLSLL._SL160_.jpg","min":15,"max":89,"name":"Coffee Grinder","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51GYwGghO1L._SL160_.jpg","min":17,"max":200,"name":"Air Compressor","tags":["auto","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41G%2BXZMc5YL._SL160_.jpg","min":49,"max":120,"name":"Microwave","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41t0Z%2BZjSYL._SL160_.jpg","min":20,"max":150,"name":"Dictaphone","tags":["gadgets","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41-MVf%2BP3OL._SL160_.jpg","min":8,"max":70,"name":"Cordless Screwdriver","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/519FUHQIiKL._SL160_.jpg","min":2,"max":60,"name":"Car Mp3 Player","tags":["auto","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51N3qTZwhgL._SL160_.jpg","min":29,"max":160,"name":"Etched Glass Photo","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51VlOVXrGIL._SL160_.jpg","min":5,"max":50,"name":"Large Plush Toy","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41QFraD07SL._SL160_.jpg","min":10,"max":200,"name":"Food Processor","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41bGxAJoGHL._SL160_.jpg","min":20,"max":180,"name":"Dremel","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41u93k2-IML._SL160_.jpg","min":37,"max":110,"name":"Stepper Fitness Machine","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51TJU-My1cL._SL160_.jpg","min":16,"max":70,"name":"Poker Set","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41LLo9J6g0L._SL160_.jpg","min":14,"max":36,"name":"Cropped Jacket","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41DHnPAsYOL._SL160_.jpg","min":15,"max":39,"name":"Jeans","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41tcxFMkzwL._SL160_.jpg","min":5,"max":50,"name":"Video Game Controller","tags":["games","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41HWrxV9BvL._SL160_.jpg","min":13,"max":120,"name":"Satchel","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Nllv1GU5L._SL160_.jpg","min":26,"max":360,"name":"Nest of Tables","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41pi%2BjnZ22L._SL160_.jpg","min":59,"max":300,"name":"Guest Bed","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41RSm1Fkp9L._SL160_.jpg","min":19,"max":51,"name":"Skechers","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51U80X4qLrL._SL160_.jpg","min":11,"max":40,"name":"Tunic Top","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41e3Q1B8aoL._SL160_.jpg","min":9,"max":74,"name":"Fleece Top","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31YhK1ZNzqL._SL160_.jpg","min":43,"max":200,"name":"Full Length Mirror","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41mFZ7-JjfL._SL160_.jpg","min":10,"max":100,"name":"Security Safe","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51By2S8mZEL._SL160_.jpg","min":17,"max":180,"name":"Knife Block","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41P-Jjjs4iL._SL160_.jpg","min":27,"max":180,"name":"Cutlery Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41inZomaWnL._SL160_.jpg","min":22,"max":170,"name":"Bed Linen","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31fXJkBYl%2BL._SL160_.jpg","min":14,"max":92,"name":"Saucepan Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51S6lX-GC0L._SL160_.jpg","min":44,"max":300,"name":"Cookware","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51S7RqAS55L._SL160_.jpg","min":15,"max":42,"name":"Art Set","tags":["art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31pPKo969UL._SL160_.jpg","min":31,"max":230,"name":"Air Hockey Table","tags":["home","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41-1GI173bL._SL160_.jpg","min":19,"max":100,"name":"Handheld Games Console","tags":["games","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41HdyWHYe3L._SL160_.jpg","min":19,"max":270,"name":"Indoor Water Feature","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41QNcbkM9OL._SL160_.jpg","min":11,"max":100,"name":"Webcam","tags":["gadgets","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/412NZdg-cVL._SL160_.jpg","min":18,"max":60,"name":"Yoga Kit","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51BGi0raNhL._SL160_.jpg","min":36,"max":230,"name":"Poker Table","tags":["home","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/416cy9PhFGL._SL160_.jpg","min":54,"max":160,"name":"External Hard Drive","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51wLUE7SWvL._SL160_.jpg","min":13,"max":77,"name":"Coffee Maker","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/414WqVYxQPL._SL160_.jpg","min":15,"max":59,"name":"Role Playing Game","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31WFe4SCoiL._SL160_.jpg","min":91,"max":350,"name":"Network Hard Drive","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51PdrxL1PhL._SL160_.jpg","min":12,"max":120,"name":"Build Your Own Robot Arm","tags":["gadgets","toys","diy"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41AMNHhOkiL._SL160_.jpg","min":18,"max":50,"name":"Archery Set","tags":["sports","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51p65jptXIL._SL160_.jpg","min":8,"max":46,"name":"Wall Lights","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51PahFM8ztL._SL160_.jpg","min":7,"max":100,"name":"Car Cleaning Kit","tags":["auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/5163Exm1ViL._SL160_.jpg","min":29,"max":50,"name":"Security Software","tags":["pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41sPP4tfsfL._SL160_.jpg","min":3,"max":80,"name":"eCigarette Kit","tags":["health","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51y2A2cW5wL._SL160_.jpg","min":10,"max":83,"name":"Kettle","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41RifH5Vl6L._SL160_.jpg","min":90,"max":260,"name":"Exercise Bike","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/411FpE-zBGL._SL160_.jpg","min":6,"max":52,"name":"Spanner Set","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51AcCBWYafL._SL160_.jpg","min":29,"max":150,"name":"Ski Jacket","tags":["fashion","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41MTJBfgHpL._SL160_.jpg","min":15,"max":65,"name":"Wine Glasses","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/418i4CWkWpL._SL160_.jpg","min":59,"max":130,"name":"Golf Bag","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41sBx3pxsuL._SL160_.jpg","min":42,"max":300,"name":"Directors Chair","tags":["outdoors","home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41SlEc%2BY1SL._SL160_.jpg","min":8,"max":92,"name":"Tool Belt","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51upJ5mn6oL._SL160_.jpg","min":12,"max":150,"name":"Football Boots","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41sp3s6e0xL._SL160_.jpg","min":6,"max":40,"name":"Hoodie","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51RWgNRhW6L._SL160_.jpg","min":30,"max":310,"name":"Party Speaker","tags":["gadgets","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51mZntlwyeL._SL160_.jpg","min":7,"max":60,"name":"Knee / Elbow Pads","tags":["sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/4136NwscDQL._SL160_.jpg","min":33,"max":99,"name":"RipStik Skateboard","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51IEn0lWh0L._SL160_.jpg","min":15,"max":120,"name":"Bird Cage","tags":["pets","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41L%2Br0px7RL._SL160_.jpg","min":30,"max":330,"name":"Pressure Cooker","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41-POBqFYEL._SL160_.jpg","min":27,"max":130,"name":"Duvet","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/615PeTqkrvL._SL160_.jpg","min":30,"max":300,"name":"Rug","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41h5-46FibL._SL160_.jpg","min":7,"max":70,"name":"Porch Light","tags":["home","garden","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51ovasILMzL._SL160_.jpg","min":50,"max":230,"name":"Luggage Set","tags":["travel"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41M0nNFqLHL._SL160_.jpg","min":46,"max":160,"name":"Wireless Video Sender","tags":["home","pc","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/410%2B3Lo5o8L._SL160_.jpg","min":18,"max":200,"name":"SmartWatch","tags":["fashion","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51y4ag%2BSFDL._SL160_.jpg","min":34,"max":250,"name":"Raspberry Pi Computer","tags":["gadgets","pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51bYeH-XIgL._SL160_.jpg","min":20,"max":130,"name":"Muscle Toner","tags":["health","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41McslfzUtL._SL160_.jpg","min":5,"max":49,"name":"Chess Set","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51weW9YtciL._SL160_.jpg","min":12,"max":70,"name":"Massage Therapy Kit","tags":["health","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41GxlKhf7IL._SL160_.jpg","min":13,"max":130,"name":"Slow Cooker","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41kSWvn9YXL._SL160_.jpg","min":23,"max":130,"name":"Bluetooth Headset","tags":["music","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31XtlO-grlL._SL160_.jpg","min":21,"max":100,"name":"Step Ladder","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61j0FT-ZE3L._SL160_.jpg","min":11,"max":30,"name":"Herbal Tea Set","tags":["grocery","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41Xv1nlsPrL._SL160_.jpg","min":14,"max":39,"name":"Trilby Hat","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41cx1e49yyL._SL160_.jpg","min":8,"max":28,"name":"Sweat Pants","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51dQ%2BnX3TQL._SL160_.jpg","min":15,"max":100,"name":"Fondue Set","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Bvh8ix%2BNL._SL160_.jpg","min":16,"max":90,"name":"Candle Making Kit","tags":["home","decoration","art","diy"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51MqQ5eLXDL._SL160_.jpg","min":18,"max":140,"name":"Sat Nav","tags":["auto","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51NudVAk8wL._SL160_.jpg","min":13,"max":60,"name":"Remote Control Colour Changing Bulb","tags":["home","decoration","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41bcoKW3MtL._SL160_.jpg","min":19,"max":90,"name":"Foot Spa","tags":["health","beauty"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41XFVZYOxEL._SL160_.jpg","min":8,"max":100,"name":"Engraving Kit","tags":["art","diy"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41k8s6uJCSL._SL160_.jpg","min":16,"max":100,"name":"Food Steamer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41nBUZSp94L._SL160_.jpg","min":15,"max":60,"name":"Exercise Ball","tags":["health","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31q4thJwVcL._SL160_.jpg","min":17,"max":60,"name":"Pillows","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31l8VGByNWL._SL160_.jpg","min":10,"max":150,"name":"Surge Protector Power Supply","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51KHRT3cfDL._SL160_.jpg","min":30,"max":110,"name":"Curtains","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51v6YUHvieL._SL160_.jpg","min":4,"max":60,"name":"Pyjamas","tags":["home","fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/01GQbq01dWL._SL160_.jpg","min":3,"max":25,"name":"Spirit Level","tags":["home","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41deceD9pwL._SL160_.jpg","min":20,"max":210,"name":"Home Automation Equipment","tags":["home","tools","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51QqXDLKLtL._SL160_.jpg","min":14,"max":140,"name":"Sandwich Toaster","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41R8nJTNt-L._SL160_.jpg","min":5,"max":40,"name":"Cigarette Lighter","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41NUDki840L._SL160_.jpg","min":13,"max":72,"name":"Cord Trousers","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51vme-3PsHL._SL160_.jpg","min":16,"max":200,"name":"Crystal Decanter","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51kZxQ5W51L._SL160_.jpg","min":10,"max":410,"name":"Towel Bale","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51mP5kLP5gL._SL160_.jpg","min":28,"max":120,"name":"Padded Jacket","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51AddUe%2BXoL._SL160_.jpg","min":24,"max":60,"name":"Backgammon Set","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/4155jBPngTL._SL160_.jpg","min":8,"max":92,"name":"Exercise Mat","tags":["sports","health"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41KMOeVQ7dL._SL160_.jpg","min":10,"max":45,"name":"Carpet Sweeper","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41K8ozEe1IL._SL160_.jpg","min":10,"max":120,"name":"Hedge Trimmer","tags":["home","garden","tools"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/5101l0J%2BR5L._SL160_.jpg","min":10,"max":300,"name":"HexBug Kit","tags":["gadgets","pc","toys","diy"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/511W50F386L._SL160_.jpg","min":16,"max":190,"name":"iPad Keyboard","tags":["gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51nk%2BaSvOFL._SL160_.jpg","min":50,"max":280,"name":"Kindle","tags":["gadgets","books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41RTp%2BOjLhL._SL160_.jpg","min":29,"max":130,"name":"Laser Printer","tags":["gadgets","pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ebjGCaWGL._SL160_.jpg","min":40,"max":490,"name":"Infra-red Wildlife Camera","tags":["gadgets","outdoors","photography"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/412pAyQgDiL._SL160_.jpg","min":30,"max":280,"name":"Pizza Oven","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41jNCQYb%2BkL._SL160_.jpg","min":7,"max":180,"name":"NutriBullet Juicer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31TyaU1U0iL._SL160_.jpg","min":23,"max":150,"name":"Router","tags":["home","gadgets","pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41CY5oU6vUL._SL160_.jpg","min":78,"max":190,"name":"Skatecycle","tags":["outdoors","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51Kyh4XwncL._SL160_.jpg","min":7,"max":150,"name":"Guitar","tags":["art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51YndxZLJmL._SL160_.jpg","min":60,"max":290,"name":"SSD Solid State Hard Drive","tags":["gadgets","pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41cveZwpgFL._SL160_.jpg","min":44,"max":280,"name":"USB Turntable","tags":["gadgets","pc","art","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ArHYuyy3L._SL160_.jpg","min":25,"max":300,"name":"Juicer","tags":["kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31lJDIiW%2BwL._SL160_.jpg","min":27,"max":200,"name":"Home Security Camera","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51QhLzx0XEL._SL160_.jpg","min":16,"max":100,"name":"Garden Bench","tags":["garden"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/516TrXl0ywL._SL160_.jpg","min":45,"max":150,"name":"Bicycle","tags":["sports","cycling"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/414AhhPrwpL._SL160_.jpg","min":129,"max":500,"name":"Home Cinema System","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51RWgNRhW6L._SL160_.jpg","min":6,"max":160,"name":"Rocker Bluetooth Speaker","tags":["art","music","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41xJXaqAvvL._SL160_.jpg","min":29,"max":210,"name":"Photo Printer","tags":["home","gadgets","photography","pc"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/518jEujS64L._SL160_.jpg","min":12,"max":76,"name":"Climbing Boots","tags":["sports","fashion","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/516TBN0dw%2BL._SL160_.jpg","min":19,"max":540,"name":"Wireless Music System","tags":["home","gadgets","music"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31xTmN%2BH11L._SL160_.jpg","min":15,"max":600,"name":"Car Roof Box","tags":["auto"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ohrVCOZuL._SL160_.jpg","min":15,"max":220,"name":"Dehumidifier","tags":["home","tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41B1E-VhKbL._SL160_.jpg","min":30,"max":420,"name":"Golf Clubs","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51lU5b-fuIL._SL160_.jpg","min":11,"max":100,"name":"Disco Equipment","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41NqOp9cCsL._SL160_.jpg","min":75,"max":210,"name":"Video Doorbell","tags":["home","tools","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51KRexmCuYL._SL160_.jpg","min":39,"max":500,"name":"Camcorder","tags":["photography","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61WjBUUDoRL._SL160_.jpg","min":12,"max":460,"name":"Kite Buggy","tags":["outdoors","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41pGsvBJ3NL._SL160_.jpg","min":30,"max":100,"name":"Cross Trainer","tags":["fashion","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41cAUNN-B9L._SL160_.jpg","min":11,"max":270,"name":"Home Security Alarm Kit","tags":["home","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41bGfmyne3L._SL160_.jpg","min":50,"max":360,"name":"Laundry Dryer","tags":["home"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41et6p4PIgL._SL160_.jpg","min":65,"max":230,"name":"Wine Cooler","tags":["home","kitchen"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/518mU6Oi6XL._SL160_.jpg","min":150,"max":480,"name":"Desktop Computer","tags":["tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41GNIVULtQL._SL160_.jpg","min":185,"max":1000,"name":"Treadmill","tags":["home","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41HfDkXXyeL._SL160_.jpg","min":250,"max":2000,"name":"Laptop","tags":["tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41n96qrnj0L._SL160_.jpg","min":150,"max":300,"name":"Segway Board","tags":["tech","gadgets","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51FHF%2B03nQL._SL160_.jpg","min":90,"max":800,"name":"TV","tags":["tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51f-KQ%2BTwpL._SL160_.jpg","min":148,"max":420,"name":"iPad","tags":["tech","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51THJhxq2NL._SL160_.jpg","min":23,"max":790,"name":"3D Printer","tags":["tech","art"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51eLqI5aUCL._SL160_.jpg","min":69,"max":900,"name":"Multi-Game Table","tags":["games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51wPQQ4mFAL._SL160_.jpg","min":40,"max":890,"name":"Moped","tags":["outdoors","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41xol8BF0VL._SL160_.jpg","min":19,"max":260,"name":"Retro Arcade Machine","tags":["toys","games"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51ZZ8TiInGL._SL160_.jpg","min":6,"max":33,"name":"Finger Puppet Set","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51qvh4MALwL._SL160_.jpg","min":3,"max":29,"name":"Childrens Book","tags":["books"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51WqP60CcJL._SL160_.jpg","min":5,"max":50,"name":"Height Chart","tags":["home","decoration"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41p9D9CV9wL._SL160_.jpg","min":7,"max":41,"name":"Pinata","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51yTA0r6u9L._SL160_.jpg","min":15,"max":50,"name":"Colour Doodle Board","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51N43Ux11KL._SL160_.jpg","min":7,"max":40,"name":"Dinosaur Toy","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/512IUV5h9yL._SL160_.jpg","min":22,"max":81,"name":"Cardboard Play House","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31xpWPgMCyL._SL160_.jpg","min":17,"max":40,"name":"Kids Onesie","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41jVoJSIAdL._SL160_.jpg","min":8,"max":45,"name":"Play-Doh Cupcake Set","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61qvf6pGlOL._SL160_.jpg","min":24,"max":70,"name":"Pop Up Tent / House","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41HoLEb4%2BNL._SL160_.jpg","min":10,"max":27,"name":"Play Tea Set","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/61hHdSjuEnL._SL160_.jpg","min":7,"max":25,"name":"Socks","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51IyETea7UL._SL160_.jpg","min":7,"max":41,"name":"Teddy Bear","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51RebedbLYL._SL160_.jpg","min":6,"max":50,"name":"Play Camera","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41pdyxrn64L._SL160_.jpg","min":13,"max":53,"name":"Cuddly Toy","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41BihpYF9KL._SL160_.jpg","min":10,"max":110,"name":"Interactive Zoomer Animal","tags":["toys","tech"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51dSFnHUYVL._SL160_.jpg","min":14,"max":57,"name":"Play Farm Set","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41ENNj4uHxL._SL160_.jpg","min":20,"max":56,"name":"Pogo Stick","tags":["toys","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41CA7xS4brL._SL160_.jpg","min":4,"max":40,"name":"Best Selling Toy","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/514rMzG6HPL._SL160_.jpg","min":12,"max":79,"name":"Stars Projector Nightlight","tags":["home","decoration","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51mf0jgGl8L._SL160_.jpg","min":30,"max":100,"name":"Skateboard","tags":["outdoors","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51XNbTm8oOL._SL160_.jpg","min":10,"max":38,"name":"Diabolo","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31lNXD9xESL._SL160_.jpg","min":26,"max":140,"name":"Scooter","tags":["outdoors","sports"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/410tM9OcKdL._SL160_.jpg","min":29,"max":130,"name":"Coat","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51CCBvOHliL._SL160_.jpg","min":20,"max":150,"name":"Jacket","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41BwI0iWbkL._SL160_.jpg","min":10,"max":80,"name":"Kids Watch","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51POnXfWoaL._SL160_.jpg","min":17,"max":28,"name":"Space Hopper","tags":["home","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41f4VWXrTEL._SL160_.jpg","min":10,"max":65,"name":"Shoes","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41N8QMfxBhL._SL160_.jpg","min":20,"max":100,"name":"Aurora Lights Projector","tags":["home","decoration","toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51gxO%2B%2B6hBL._SL160_.jpg","min":40,"max":160,"name":"Laser Tag","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41mXORUPCvL._SL160_.jpg","min":16,"max":70,"name":"Fleece","tags":["fashion"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51AWRwPgSqL._SL160_.jpg","min":23,"max":96,"name":"Roller Blades","tags":["sports","outdoors"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51IyETea7UL._SL160_.jpg","min":7,"max":41,"name":"Teddy Bear","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41YjNdwEh6L._SL160_.jpg","min":17,"max":58,"name":"Remote Control Tarantula","tags":["toys","gadgets","tech"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/31JdS1LgveL._SL160_.jpg","min":26,"max":200,"name":"Quadcopter","tags":["toys","gadgets","tech"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41AbV2HEh1L._SL160_.jpg","min":12,"max":240,"name":"Dinosaur Skull Replica","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/51MOlZc3ZVL._SL160_.jpg","min":6,"max":60,"name":"Engraved Pen","tags":["home","office"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41BMgAEZnnL._SL160_.jpg","min":18,"max":50,"name":"Remote Control Car","tags":["toys","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/21Q2RiZZ-6L._SL160_.jpg","min":10,"max":300,"name":"Model Train","tags":["toys","gadgets"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41om-poMLdL._SL160_.jpg","min":9,"max":25,"name":"Model Plane","tags":["toys"]},{"img":"https://images-na.ssl-images-amazon.com/images/I/41UcZ1oVA0L._SL160_.jpg","min":3,"max":27,"name":"Collectable Model Car","tags":["toys"]}];


var app = angular.module('app', ['rzModule']);

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

app.controller('mainCtrl', ['$scope', '$interval', '$timeout', '$sce', '$document', function ($scope, $interval, $timeout, $sce, $document) {
	
	$scope.data = {
		gifts: DATA.gifts,
        categories: DATA.categories
	};

    $scope.priceSlider = {
        min: '$0',
        max: '$300',
        options: {
            floor: '$0',
            ceil: '$300',
            stepsArray: ['$0', '$1', '$2', '$3', '$4', '$5', '$7', '$10', '$15', '$20', '$25', '$30', '$40', '$50', '$75', '$100', '$125', '$150', '$200', '$300'],
            ticksArray: [0, 5, 9, 13, 19],
            showTicks: true,
            showTicksValues: true
        }
    };

    $scope.data.favs = JSON.parse(localStorage.getItem('favs') || '[]') || [];

    $scope.toggleFav = function(gift){
        if ($scope.data.favs.indexOf(gift.name) == -1) {
            $scope.data.favs.push(gift.name);
            $scope.data.favs = $scope.data.favs.filter(onlyUnique);
        } else {
            var index = $scope.data.favs.indexOf(gift.name);
            $scope.data.favs.splice(index, 1);
        }
        localStorage.setItem('favs', JSON.stringify($scope.data.favs));
    };

	$scope.selectCategory = function(category){
        angular.forEach($scope.data.categories, function(cat) {
            cat.show = (cat.name == category) || category == 'all';
        });
	}

	$scope.getLink = function(gift){
	    return 'https://www.amazon.com/s?tag=giftaz-20&field-keywords=' + encodeURIComponent(gift.name);
    };

}]);

app.filter('filterCategories', function() {
    return function(input, categories) {
    	var out = [];
        angular.forEach(input, function(item) {
        	var show = false;
			for (var c in categories) {
				if (categories[c].show && item.tags.indexOf(categories[c].name) > -1) {
					show = true;
					break;
				}
			}
            if (show) out.push(item);
        });
        return out;
    }
});
app.filter('filterPrices', function() {
    return function(input, price) {
        var out = [];
        var min = parseInt(price.min.replace('$', ''));
        var max = parseInt(price.max.replace('$', ''));
        angular.forEach(input, function(item) {
            if (! (item.min > max || item.max < min)) {
                out.push(item);
            }
        });
        return out;
    }
});
app.filter('filterFavs', function() {
    return function(input, favs) {
        var out = [];
        angular.forEach(input, function(item) {
            if (favs.indexOf(item.name) > -1) {
                out.push(item);
            }
        });
        return out;
    }
});
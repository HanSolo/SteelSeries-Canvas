/*!
 * Name          : steelseries.js
 * Author        : Gerrit Grunwald, Mark Crossley
 * Last modified : 29.01.2012
 * Revision      : 0.9.17
 */

var steelseries = function() {
    var doc = document;
    var lcdFontName = 'LCDMono2Ultra,sans-serif';

    //*************************************   C O M P O N O N E N T S   ************************************************
    var radial = function(canvas, parameters) {
        parameters = parameters || {};
        var gaugeType = (undefined === parameters.gaugeType ? steelseries.GaugeType.TYPE4 : parameters.gaugeType);
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var minValue = (undefined === parameters.minValue ? 0 : parameters.minValue);
        var maxValue = (undefined === parameters.maxValue ? (minValue + 100) : parameters.maxValue);
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var section = (undefined === parameters.section ? null : parameters.section);
        var area = (undefined === parameters.area ? null : parameters.area);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var pointerType = (undefined === parameters.pointerType ? steelseries.PointerType.TYPE1 : parameters.pointerType);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var fractionalScaleDecimals = (undefined === parameters.fractionalScaleDecimals ? 1 : parameters.fractionalScaleDecimals);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);
        var ledVisible = (undefined === parameters.ledVisible ? true : parameters.ledVisible);
        var thresholdVisible = (undefined === parameters.thresholdVisible ? true : parameters.thresholdVisible);
        var minMeasuredValueVisible = (undefined === parameters.minMeasuredValueVisible ? false : parameters.minMeasuredValueVisible);
        var maxMeasuredValueVisible = (undefined === parameters.maxMeasuredValueVisible ? false : parameters.maxMeasuredValueVisible);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);
        var tickLabelOrientation = (undefined === parameters.tickLabelOrientation ? (gaugeType === steelseries.GaugeType.TYPE1 ? steelseries.TickLabelOrientation.TANGENT : steelseries.TickLabelOrientation.NORMAL) : parameters.tickLabelOrientation);
        var trendVisible = (undefined === parameters.trendVisible ? false : parameters.trendVisible);
        var trendColors = (undefined === parameters.trendColors ? [steelseries.LedColor.RED_LED,steelseries.LedColor.GREEN_LED,steelseries.LedColor.CYAN_LED] : parameters.trendColors);

        // Create audio tag for alarm sound
        if (playAlarm && alarmSound !== false) {
            var audioElement = doc.createElement('audio');
            audioElement.setAttribute('src', alarmSound);
            //audioElement.setAttribute('src', 'js/alarm.mp3');
            audioElement.setAttribute('preload', 'auto');
        }

        var value = minValue;
        var self = this;

        // Properties
        var minMeasuredValue = maxValue;
        var maxMeasuredValue = minValue;

        var ledBlinking = false;

        var ledTimerId = 0;
        var tween;

        var trendIndicator = steelseries.TrendState.OFF;
        var trendSize = size * 0.06;
        var trendPosX = size * 0.29;
        var trendPosY = size * 0.36;

        // GaugeType specific private variables
        var freeAreaAngle;
        var rotationOffset;
        var tickmarkOffset;
        var angleRange;
        var angleStep;

        var angle = rotationOffset + (value - minValue) * angleStep;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        // Misc
        var ledPosX = 0.6 * imageWidth;
        var ledPosY = 0.4 * imageHeight;
        var lcdFontHeight = Math.floor(imageWidth / 10);
        var stdFont = lcdFontHeight + 'px sans-serif';
        var lcdFont = lcdFontHeight + 'px ' + lcdFontName;
        var lcdHeight = imageHeight * 0.13;
        var lcdWidth = imageWidth * 0.4;
        var lcdPosX = (imageWidth - lcdWidth) / 2;
        var lcdPosY = imageHeight * 0.57;

        // Constants
        var HALF_PI = Math.PI / 2;
        var RAD_FACTOR = Math.PI / 180;
        var initialized = false;

        // Tickmark specific private variables
        var niceMinValue = minValue;
        var niceMaxValue = maxValue;
        var niceRange = maxValue - minValue;
        var range = niceMaxValue - niceMinValue;
        var minorTickSpacing = 0;
        var majorTickSpacing = 0;
        var maxNoOfMinorTicks = 10;
        var maxNoOfMajorTicks = 10;

        // Method to calculate nice values for min, max and range for the tickmarks
        var calculate = function calculate() {
            if (niceScale) {
                niceRange = calcNiceNumber(maxValue - minValue, false);
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                niceMinValue = Math.floor(minValue / majorTickSpacing) * majorTickSpacing;
                niceMaxValue = Math.ceil(maxValue / majorTickSpacing) * majorTickSpacing;
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
                minValue = niceMinValue;
                maxValue = niceMaxValue;
                range = maxValue - minValue;
            } else {
                niceRange = (maxValue - minValue);
                niceMinValue = minValue;
                niceMaxValue = maxValue;
                range = niceRange;
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
            }

            switch (gaugeType.type) {
                case 'type1':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = HALF_PI;
                    angleStep = angleRange / range;
                    break;

                case 'type2':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type3':
                    freeAreaAngle = 0;
                    rotationOffset = HALF_PI;
                    tickmarkOffset = 0;
                    angleRange = 1.5 * Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type4':
                default:
                    freeAreaAngle = 60 * RAD_FACTOR;
                    rotationOffset = HALF_PI + (freeAreaAngle / 2);
                    tickmarkOffset = 0;
                    angleRange = 2 * Math.PI - freeAreaAngle;
                    angleStep = angleRange / range;
                    break;
            }
            angle = rotationOffset + (value - minValue) * angleStep;
        };

        // **************   Buffer creation  ********************
        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for the background
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        var lcdBuffer;

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(size * 0.093457, size * 0.093457);
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(size * 0.093457, size * 0.093457);
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.028037), Math.ceil(size * 0.028037));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.028037), Math.ceil(size * 0.028037));
        var maxMeasuredValueCtx = maxMeasuredValueBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var pointerBuffer = createBuffer(size, size);
        var pointerContext = pointerBuffer.getContext('2d');

        // Buffer for pointer shadow
        var pointerShadowBuffer = createBuffer(size, size);
        var pointerShadowContext = pointerShadowBuffer.getContext('2d');

        // Buffer for pointer shadow rotation
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // Buffers for trend indicators
        var trendUpBuffer, trendSteadyBuffer, trendDownBuffer, trendOffBuffer;

        // **************   Image creation  ********************
        var drawLcdText = function(value) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageWidth * 0.007;
                mainCtx.shadowOffsetY = imageWidth * 0.007;
                mainCtx.shadowBlur = imageWidth * 0.007;
            }
            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            mainCtx.fillText(value.toFixed(lcdDecimals), lcdPosX + lcdWidth - lcdWidth * 0.05, lcdPosY + lcdHeight * 0.5 + lcdFontHeight * 0.38, lcdWidth * 0.9);

            mainCtx.restore();
        };

        var drawPostsImage = function(ctx) {
            ctx.save();

            if ('type1' === gaugeType.type) {
                // Draw max center top post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.523364, imageHeight * 0.130841);
            }

            if ('type1' === gaugeType.type || 'type2' === gaugeType.type) {
                // Draw min left post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.130841, imageHeight * 0.514018);
            }

            if ('type2' === gaugeType.type || 'type3' === gaugeType.type) {
                // Draw max right post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.831775, imageHeight * 0.514018);
            }

            if ('type3' === gaugeType.type) {
                // Draw min center bottom post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.523364, imageHeight * 0.831775);
            }

            if ('type4' === gaugeType.type) {
                // Min post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.336448, imageHeight * 0.803738);

                // Max post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.626168, imageHeight * 0.803738);
            }

            ctx.restore();

        };

        var createThresholdImage = function() {
            var thresholdBuffer = doc.createElement('canvas');
            thresholdBuffer.width = Math.ceil(size * 0.046728);
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0, '#520000');
            gradThreshold.addColorStop(0.3, '#fc1d00');
            gradThreshold.addColorStop(0.59, '#fc1d00');
            gradThreshold.addColorStop(1, '#520000');
            thresholdCtx.fillStyle = gradThreshold;

            thresholdCtx.beginPath();
            thresholdCtx.moveTo(thresholdBuffer.width * 0.5, 0.1);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.9, thresholdBuffer.height * 0.9);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.1, thresholdBuffer.height * 0.9);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.5, 0.1);
            thresholdCtx.closePath();

            thresholdCtx.fill();
            thresholdCtx.strokeStyle = '#FFFFFF';
            thresholdCtx.stroke();

            thresholdCtx.restore();

            return thresholdBuffer;
        };

        var drawAreaSectionImage = function(ctx, start, stop, color, filled) {
            if (start < minValue) start = minValue;
            else if (start > maxValue) start = maxValue;
            if (stop < minValue) stop = minValue;
            else if (stop > maxValue) stop = maxValue;

            if (start >= stop) return;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = imageWidth * 0.035;
            var startAngle = (angleRange / range * start - angleRange / range * minValue);
            var stopAngle = startAngle + (stop - start) / (range / angleRange);
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            ctx.beginPath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, imageWidth * 0.365 - ctx.lineWidth / 2, startAngle, stopAngle, false);
            } else {
                ctx.arc(0, 0, imageWidth * 0.365, startAngle, stopAngle, false);
            }
//            ctx.closePath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.fill();
            } else {
                ctx.stroke();
            }

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = Math.ceil(imageWidth * 0.04);
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            var alpha = rotationOffset;      // Tracks total rotation
            var rotationStep = angleStep * minorTickSpacing;
            var textRotationAngle;

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;

            var OUTER_POINT = imageWidth * 0.38;
            var MAJOR_INNER_POINT = imageWidth * 0.35;
            var MED_INNER_POINT = imageWidth * 0.355;
            var MINOR_INNER_POINT = imageWidth * 0.36;
            var TEXT_TRANSLATE_X = imageWidth * 0.3;
            var TEXT_WIDTH = imageWidth * 0.1;
            if (gaugeType.type === 'type1' || gaugeType.type === 'type2') {
                TEXT_WIDTH = imageWidth * 0.035;
            }
            var HALF_MAX_NO_OF_MINOR_TICKS = maxNoOfMinorTicks / 2;
            var MAX_VALUE_ROUNDED = parseFloat(maxValue.toFixed(2));

            for (var i = minValue; parseFloat(i.toFixed(2)) <= MAX_VALUE_ROUNDED; i += minorTickSpacing) {
                textRotationAngle = rotationStep + HALF_PI;
                majorTickCounter++;
                // Draw major tickmarks
                if (majorTickCounter === maxNoOfMinorTicks) {
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MAJOR_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.save();
                    ctx.translate(TEXT_TRANSLATE_X, 0);
                    switch(tickLabelOrientation.type) {
                        case 'horizontal':
                            textRotationAngle = -alpha;
                            break;
                        case 'tangent':
                            textRotationAngle = (alpha <= HALF_PI + Math.PI ? Math.PI : 0);
                            break;
                        case 'normal':
                        default:
                            textRotationAngle = HALF_PI;
                            break;
                    }
                    ctx.rotate(textRotationAngle);
                    switch(labelNumberFormat.format) {
                        case 'fractional':
                            ctx.fillText((valueCounter.toFixed(fractionalScaleDecimals)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'scientific':
                            ctx.fillText((valueCounter.toPrecision(2)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'standard':
                        default:
                            ctx.fillText((valueCounter.toFixed(0)), 0, 0, TEXT_WIDTH);
                            break;
                    }
                    ctx.translate(-TEXT_TRANSLATE_X, 0);
                    ctx.restore();

                    valueCounter += majorTickSpacing;
                    majorTickCounter = 0;
                    ctx.rotate(rotationStep);
                    alpha += rotationStep;
                    continue;
                }

                // Draw tickmark every minor tickmark spacing
                if (0 === maxNoOfMinorTicks % 2 && majorTickCounter === (HALF_MAX_NO_OF_MINOR_TICKS)) {
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MED_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MINOR_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                }
                ctx.rotate(rotationStep);
                alpha += rotationStep;
            }

            /*
             // Logarithmic scale
             var tmp = 0.1;
             var minValueLog10 = 0.1;
             var maxValueLog10 = parseInt(Math.pow(10, Math.ceil(Math.log10(maxValue))));
             var drawLabel = true;
             angleStep = angleRange / (maxValueLog10 - minValueLog10)
             for (var scaleFactor = minValueLog10 ; scaleFactor <= maxValueLog10 ; scaleFactor *= 10)
             {
             for (var i = parseFloat((1 * scaleFactor).toFixed(1)) ; i < parseFloat((10 * scaleFactor).toFixed(1)) ; i += scaleFactor)
             {
             textRotationAngle =+ rotationStep + Math.PI / 2;

             if(drawLabel)
             {
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.moveTo(imageWidth * 0.38,0);
             ctx.lineTo(imageWidth * 0.35,0);
             ctx.closePath();
             ctx.stroke();
             ctx.save();
             ctx.translate(imageWidth * 0.31, 0);
             ctx.rotate(textRotationAngle);
             ctx.fillText(parseFloat((i).toFixed(1)), 0, 0, imageWidth * 0.0375);
             ctx.translate(-imageWidth * 0.31, 0);
             ctx.restore();
             drawLabel = false;
             }
             else
             {
             ctx.lineWidth = 0.5;
             ctx.beginPath();
             ctx.moveTo(imageWidth * 0.38,0);
             ctx.lineTo(imageWidth * 0.36,0);
             ctx.closePath();
             ctx.stroke();
             }
             //doc.write("log10 scale value: " + parseFloat((i).toFixed(1)) + "<br>");
             //Math.log10(parseFloat((i).toFixed(1)));

             ctx.rotate(rotationStep);
             }
             tmp = 0.1;
             drawLabel = true;
             }
             */

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawLed = (undefined === parameters.led ? false : parameters.led);
            var drawPointer = (undefined === parameters.pointer ? false : parameters.pointer);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);
            var drawTrend = (undefined === parameters.trend ? false : parameters.trend);

            initialized = true;

            // Calculate the current min and max values and the range
            calculate();

            // Create frame in frame buffer (backgroundBuffer)
            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(Math.ceil(size * 0.093457), 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(Math.ceil(size * 0.093457), 0, ledColor), 0, 0);
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.028037), steelseries.ColorDef.BLUE.dark.getRgbaColor(), true, true), 0, 0);
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.028037), steelseries.ColorDef.RED.medium.getRgbaColor(), true), 0, 0);
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawPostsImage(backgroundContext);

                // Create section in background buffer (backgroundBuffer)
                if (null !== section && 0 < section.length) {
                    var sectionIndex = section.length;
                    do {
                        sectionIndex--;
                        drawAreaSectionImage(backgroundContext, section[sectionIndex].start, section[sectionIndex].stop, section[sectionIndex].color, false);
                    }
                    while (0 < sectionIndex);
                }

                // Create area in background buffer (backgroundBuffer)
                if (null !== area && 0 < area.length) {
                    var areaIndex = area.length;
                    do {
                        areaIndex--;
                        drawAreaSectionImage(backgroundContext, area[areaIndex].start, area[areaIndex].stop, area[areaIndex].color, true);
                    }
                    while (0 < areaIndex);
                }

                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat);

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, true, true);
            }

            // Draw threshold image to background context
            if (drawBackground && thresholdVisible) {
                backgroundContext.save();
                backgroundContext.translate(centerX, centerY);
                backgroundContext.rotate(rotationOffset + (threshold - minValue) * angleStep + HALF_PI);
                backgroundContext.translate(-centerX, -centerY);
                backgroundContext.drawImage(createThresholdImage(), imageWidth * 0.475, imageHeight * 0.13);
                backgroundContext.translate(centerX, centerY);
                backgroundContext.restore();
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                lcdBuffer = createLcdBackgroundImage(lcdWidth, lcdHeight, lcdColor);
                backgroundContext.drawImage(lcdBuffer, lcdPosX, lcdPosY);
            }

            // Create pointer image in pointer buffer (contentBuffer)
            if (drawPointer) {
                drawPointerImage(pointerContext, imageWidth, pointerType, pointerColor, backgroundColor.labelColor, false);
                drawPointerImage(pointerShadowContext, imageWidth, pointerType, pointerColor, backgroundColor.labelColor, true);
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground && foregroundVisible) {
                var knobVisible = (pointerType.type === 'type15' || pointerType.type === 'type16' ? false : true);
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, knobVisible, knobType, knobStyle, gaugeType);
            }

            // Create the trend indicator buffers
            if (drawTrend && trendVisible) {
                trendUpBuffer = createTrendIndicator(trendSize, steelseries.TrendState.UP, trendColors);
                trendSteadyBuffer = createTrendIndicator(trendSize, steelseries.TrendState.STEADY, trendColors);
                trendDownBuffer = createTrendIndicator(trendSize, steelseries.TrendState.DOWN, trendColors);
                trendOffBuffer = createTrendIndicator(trendSize, steelseries.TrendState.OFF, trendColors);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetLed = (undefined === buffers.led ? false : buffers.led);
            var resetPointer = (undefined === buffers.pointer ? false : buffers.pointer);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if(resetLed) {
                ledBufferOn.width = Math.ceil(size * 0.093457);
                ledBufferOn.height = Math.ceil(size * 0.093457);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(size * 0.093457);
                ledBufferOff.height = Math.ceil(size * 0.093457);
                ledContextOff = ledBufferOff.getContext('2d');

                // Buffer for current led painting code
                ledBuffer = ledBufferOff;
            }

            if (resetPointer) {
                pointerBuffer.width = size;
                pointerBuffer.height = size;
                pointerContext = pointerBuffer.getContext('2d');

                pointerShadowBuffer.width = size;
                pointerShadowBuffer.height = size;
                pointerShadowContext = pointerShadowBuffer.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
           }

            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(toggleAndRepaintLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };

        var toggleAndRepaintLed = function() {
            if (ledVisible) {
                if (ledBuffer === ledBufferOn) {
                    ledBuffer = ledBufferOff;
                } else {
                    ledBuffer = ledBufferOn;
                }

               self.repaint();
            }
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            var targetValue = newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue);
            if (value !== targetValue) {
                 value = targetValue;

                if (value > maxMeasuredValue) {
                    maxMeasuredValue = value;
                }
                if (value < minMeasuredValue) {
                    minMeasuredValue = value;
                }

                if (value >= threshold && !ledBlinking) {
                    ledBlinking = true;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.play();
                    }
                } else if (value < threshold) {
                    ledBlinking = false;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.pause();
                    }
                }
                this.repaint();
           }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                if (undefined !== tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    if (value >= threshold && !ledBlinking) {
                        ledBlinking = true;
                        blink(ledBlinking);
                    } else if (value < threshold) {
                        ledBlinking = false;
                        blink(ledBlinking);
                    }

                    if (value > maxMeasuredValue) {
                        maxMeasuredValue = value;
                    }
                    if (value < minMeasuredValue) {
                        minMeasuredValue = value;
                    }

                    gauge.repaint();
                };
                tween.start();
            }
        };

        this.resetMinMeasuredValue = function() {
            minMeasuredValue = value;
            this.repaint();
        };

        this.resetMaxMeasuredValue = function() {
            maxMeasuredValue = value;
            this.repaint();
        };

        this.setMinMeasuredValueVisible = function(visible) {
            minMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setMaxMeasuredValueVisible = function(visible) {
            maxMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setMaxMeasuredValue = function(newValue) {
            var targetValue = newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue);
            maxMeasuredValue = targetValue;
            this.repaint();
        };

        this.setMinMeasuredValue = function(newValue) {
            var targetValue = newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue);
            minMeasuredValue = targetValue;
            this.repaint();
        };

        this.setTitleString = function(title){
            titleString = title;
            init({background: true});
            this.repaint();
        };

        this.setUnitString = function(unit){
            unitString = unit;
            init({background: true});
            this.repaint();
        };

        this.setMinValue = function(value){
            minValue = value;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.getMinValue = function(){
            return minValue;
        };

        this.setMaxValue = function(value){
            maxValue = value;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.getMaxValue = function(){
            return maxValue;
        };

        this.setThreshold = function(newValue) {
            var targetValue = newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue);
            threshold = targetValue;
            init({background: true});
            this.repaint();
        };

        this.setArea = function(areaVal){
            area = areaVal;
            resetBuffers({foreground: true});
            init({background: true,
                  foreground: true
                  });
            this.repaint();
        };

        this.setSection = function(areaSec){
                section = areaSec;
                resetBuffers({foreground: true});
                init({background: true,
                      foreground: true
                      });
                this.repaint();
        };

        this.setThresholdVisible = function(visible) {
            thresholdVisible = visible;
            this.repaint();
        };

        this.setLcdDecimals = function(decimals) {
            lcdDecimals = decimals;
            this.repaint();
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({
                background: true,
                pointer: true       // type2 & 13 depend on background
                });
            backgroundColor = newBackgroundColor;
            init({
                background: true,   // type2 & 13 depend on background
                pointer: true
                });
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setPointerType = function(newPointerType) {
            resetBuffers({pointer: true,
                          foreground: true
                         });
            pointerType = newPointerType;
            init({pointer: true,
                  foreground: true
                  });
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers({pointer: true});
            pointerColor = newPointerColor;
            init({pointer: true});
            this.repaint();
        };

        this.setLedColor = function(newLedColor) {
            resetBuffers({led: true});
            ledColor = newLedColor;
            init({led: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.setTrend = function(newValue) {
            trendIndicator = newValue;
            this.repaint();
        };

        this.setTrendVisible = function(visible) {
            trendVisible = visible;
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointer: true,
                      trend: true,
                      foreground: true});
            }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
             mainCtx.drawImage(backgroundBuffer, 0, 0);


            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(value);
            }

            // Draw led
            if (ledVisible) {
                if (value < threshold) {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, ledPosX, ledPosY);
            }

            // Draw the trend indicator
            if (trendVisible){
                switch (trendIndicator.state) {
                    case 'up':
                        mainCtx.drawImage(trendUpBuffer, trendPosX, trendPosY);
                        break;
                    case 'steady':
                        mainCtx.drawImage(trendSteadyBuffer, trendPosX, trendPosY);
                        break;
                    case 'down':
                        mainCtx.drawImage(trendDownBuffer, trendPosX, trendPosY);
                        break;
                    case 'off':
                        mainCtx.drawImage(trendOffBuffer, trendPosX, trendPosY);
                        break;
                }
            }

            // Draw min measured value indicator
            if (minMeasuredValueVisible) {
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate(rotationOffset + HALF_PI + (minMeasuredValue - minValue) * angleStep);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(minMeasuredValueBuffer, mainCtx.canvas.width * 0.4865, mainCtx.canvas.height * 0.105);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate(rotationOffset + HALF_PI + (maxMeasuredValue - minValue) * angleStep);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(maxMeasuredValueBuffer, mainCtx.canvas.width * 0.4865, mainCtx.canvas.height * 0.105);
                mainCtx.restore();
            }

            angle = rotationOffset + HALF_PI + (value - minValue) * angleStep;

            // have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angle);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointerShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            mainCtx.save();

            // Define rotation center
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angle);

            // Draw pointer
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBuffer, 0, 0);
            mainCtx.restore();

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var radialBargraph = function(canvas, parameters) {
        parameters = parameters || {};
        var gaugeType = (undefined === parameters.gaugeType ? steelseries.GaugeType.TYPE4 : parameters.gaugeType);
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var minValue = (undefined === parameters.minValue ? 0 : parameters.minValue);
        var maxValue = (undefined === parameters.maxValue ? (minValue + 100) : parameters.maxValue);
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var section = (undefined === parameters.section ? null : parameters.section);
        var useSectionColors = (undefined === parameters.useSectionColors ? false : parameters.useSectionColors);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var valueColor = (undefined === parameters.valueColor ? steelseries.ColorDef.RED : parameters.valueColor);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var fractionalScaleDecimals = (undefined === parameters.fractionalScaleDecimals ? 1 : parameters.fractionalScaleDecimals);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);
        var ledVisible = (undefined === parameters.ledVisible ? true : parameters.ledVisible);
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);
        var valueGradient  = (undefined === parameters.valueGradient  ? null : parameters.valueGradient );
        var useValueGradient = (undefined === parameters.useValueGradient ? false : parameters.useValueGradient);
        var tickLabelOrientation = (undefined === parameters.tickLabelOrientation ? (gaugeType === steelseries.GaugeType.TYPE1 ? steelseries.TickLabelOrientation.TANGENT : steelseries.TickLabelOrientation.NORMAL) : parameters.tickLabelOrientation);
        var trendVisible = (undefined === parameters.trendVisible ? false : parameters.trendVisible);
        var trendColors = (undefined === parameters.trendColors ? [steelseries.LedColor.RED_LED,steelseries.LedColor.GREEN_LED,steelseries.LedColor.CYAN_LED] : parameters.trendColors);

        // Create audio tag for alarm sound
        if (playAlarm && alarmSound !== false) {
            var audioElement = doc.createElement('audio');
            audioElement.setAttribute('src', alarmSound);
            audioElement.setAttribute('preload', 'auto');
        }

        var value = minValue;
        var range = maxValue - minValue;
        var ledBlinking = false;
        var ledTimerId = 0;
        var tween;

        // GaugeType specific private variables
        var freeAreaAngle;
        var rotationOffset;
        var bargraphOffset;
        var tickmarkOffset;
        var angleRange;
        var degAngleRange;
        var angleStep;

        var sectionAngles = [];
        var isSectionsVisible = false;
        var isGradientVisible = false;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        // Misc
        var lcdFontHeight = Math.floor(imageWidth / 10);
        var stdFont = lcdFontHeight + 'px sans-serif';
        var lcdFont = lcdFontHeight + 'px ' + lcdFontName;
        var lcdHeight = imageHeight * 0.13;
        var lcdWidth = imageWidth * 0.4;
        var lcdPosX = (imageWidth - lcdWidth) / 2;
        var lcdPosY = imageHeight /2 - lcdHeight /2;

        // Constants
        var HALF_PI = Math.PI / 2;
        var ACTIVE_LED_POS_X = imageWidth * 0.116822;
        var ACTIVE_LED_POS_Y = imageWidth * 0.485981;
        var LED_SIZE = Math.ceil(size * 0.093457);
//        var LED_POS_X = imageWidth * 0.453271;
        var LED_POS_X = imageWidth * 0.53;
        var LED_POS_Y = imageHeight * 0.61;
        var RAD_FACTOR = Math.PI / 180;

        var trendIndicator = steelseries.TrendState.OFF;
        var trendSize = size * 0.06;
        var trendPosX = size * 0.38;
        var trendPosY = size * 0.57;

        switch (gaugeType.type) {
            case "type1":
                freeAreaAngle = 0;
                rotationOffset = Math.PI;
                bargraphOffset = 0;
                tickmarkOffset = HALF_PI;
                angleRange = HALF_PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type2":
                freeAreaAngle = 0;
                rotationOffset = Math.PI;
                bargraphOffset = 0;
                tickmarkOffset = HALF_PI;
                angleRange = Math.PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type3":
                freeAreaAngle = 0;
                rotationOffset = HALF_PI;
                bargraphOffset = -HALF_PI;
                tickmarkOffset = 0;
                angleRange = 1.5 * Math.PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type4":

            default:
                freeAreaAngle = 60 * Math.PI / 180;
                rotationOffset = HALF_PI + (freeAreaAngle / 2);
                bargraphOffset = -2 * Math.PI / 6;
                tickmarkOffset = 0;
                angleRange = 2 * Math.PI - freeAreaAngle;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;
        }

        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        var lcdBuffer;

        // Buffer for active bargraph led
        var activeLedBuffer = createBuffer(Math.ceil(size * 0.060747), Math.ceil(size * 0.023364));
        var activeLedContext = activeLedBuffer.getContext('2d');

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(LED_SIZE, LED_SIZE);
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(LED_SIZE, LED_SIZE);
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the background of the led
        var ledBackground;

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // Buffers for trend indicators
        var trendUpBuffer, trendSteadyBuffer, trendDownBuffer, trendOffBuffer;

        var initialized = false;

        // Tickmark specific private variables
        var niceMinValue = minValue;
        var niceMaxValue = maxValue;
        var niceRange = maxValue - minValue;
        range = niceMaxValue - niceMinValue;
        var minorTickSpacing = 0;
        var majorTickSpacing = 0;
        var maxNoOfMinorTicks = 10;
        var maxNoOfMajorTicks = 10;

        // Method to calculate nice values for min, max and range for the tickmarks
        var calculate = function calculate() {
            if (niceScale) {
                niceRange = calcNiceNumber(maxValue - minValue, false);
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                niceMinValue = Math.floor(minValue / majorTickSpacing) * majorTickSpacing;
                niceMaxValue = Math.ceil(maxValue / majorTickSpacing) * majorTickSpacing;
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
                minValue = niceMinValue;
                maxValue = niceMaxValue;
                range = maxValue - minValue;
            } else {
                niceRange = (maxValue - minValue);
                niceMinValue = minValue;
                niceMaxValue = maxValue;
                range = niceRange;
//                minorTickSpacing = 1;
//                majorTickSpacing = 10;
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
            }

            switch (gaugeType.type) {
                case 'type1':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = HALF_PI;
                    angleStep = angleRange / range;
                    break;

                case 'type2':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type3':
                    freeAreaAngle = 0;
                    rotationOffset = HALF_PI;
                    tickmarkOffset = 0;
                    angleRange = 1.5 * Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type4':
                default:
                    freeAreaAngle = 60 * RAD_FACTOR;
                    rotationOffset = HALF_PI + (freeAreaAngle / 2);
                    tickmarkOffset = 0;
                    angleRange = 2 * Math.PI - freeAreaAngle;
                    angleStep = angleRange / range;
                    break;
            }
            angle = rotationOffset + (value - minValue) * angleStep;
        };

        //********************************* Private methods *********************************
        // Draw all static painting code to background
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawLed = (undefined === parameters.led ? false : parameters.led);
            var drawValue =  (undefined === parameters.value ? false : parameters.value);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);
            var drawTrend = (undefined === parameters.trend ? false : parameters.trend);

            initialized = true;

            calculate();

            // Create frame in frame buffer (frameBuffer)
            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(LED_SIZE, 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(LED_SIZE, 0, ledColor), 0, 0);

                // Buffer the background of the led for blinking
                ledBackground = backgroundContext.getImageData(LED_POS_X, LED_POS_Y, LED_SIZE, LED_SIZE);
            }

            if (drawBackground) {
                // Create bargraphtrack in background buffer (backgroundBuffer)
                drawBargraphTrackImage(backgroundContext);
            }

            // Create tickmarks in background buffer (backgroundBuffer)
            if (drawBackground  && backgroundVisible) {
                drawTickmarksImage(backgroundContext, labelNumberFormat);

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, true, true);
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                lcdBuffer = createLcdBackgroundImage(lcdWidth, lcdHeight, lcdColor);
                backgroundContext.drawImage(lcdBuffer, lcdPosX, lcdPosY);
            }

            // Convert Section values into angles
            isSectionsVisible = false;
            if (useSectionColors && null !== section && 0 < section.length) {
                isSectionsVisible = true;
                var sectionIndex = section.length;
                sectionAngles = [];
                do {
                    sectionIndex--;
                    sectionAngles.push({start: (((section[sectionIndex].start + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange),
                                         stop: (((section[sectionIndex].stop + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange),
                                        color: customColorDef(section[sectionIndex].color)});
                } while (0 < sectionIndex);
            }

            // Use a gradient for the valueColor?
            isGradientVisible = false;
            if (useValueGradient && valueGradient !== null) {
                // force section colors off!
                isSectionsVisible = false;
                isGradientVisible = true;
            }

            // Create an image of an active led in active led buffer (activeLedBuffer)
            if (drawValue) {
                drawActiveLed(activeLedContext, valueColor);
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground && foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false, gaugeType);
            }

            // Create the trend indicator buffers
            if (drawTrend && trendVisible) {
                trendUpBuffer = createTrendIndicator(trendSize, steelseries.TrendState.UP, trendColors);
                trendSteadyBuffer = createTrendIndicator(trendSize, steelseries.TrendState.STEADY, trendColors);
                trendDownBuffer = createTrendIndicator(trendSize, steelseries.TrendState.DOWN, trendColors);
                trendOffBuffer = createTrendIndicator(trendSize, steelseries.TrendState.OFF, trendColors);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetLed = (undefined === buffers.led ? false : buffers.led);
            var resetValue = (undefined === buffers.value ? false : buffers.value);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            // Buffer for the frame
            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            // Buffer for static background painting code
            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            // Buffer for active bargraph led
            if (resetValue) {
                activeLedBuffer.width = Math.ceil(size * 0.060747);
                activeLedBuffer.height = Math.ceil(size * 0.023364);
                activeLedContext = activeLedBuffer.getContext('2d');
            }

            if (resetLed) {
                // Buffer for led on painting code
                ledBufferOn.width = Math.ceil(size * 0.093457);
                ledBufferOn.height = Math.ceil(size * 0.093457);
                ledContextOn = ledBufferOn.getContext('2d');

                // Buffer for led off painting code
                ledBufferOff.width = Math.ceil(size * 0.093457);
                ledBufferOff.height = Math.ceil(size * 0.093457);
                ledContextOff = ledBufferOff.getContext('2d');

                // Buffer for current led painting code
                ledBuffer = ledBufferOff;
            }

            // Buffer for static foreground painting code
            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var drawBargraphTrackImage = function(ctx) {

            ctx.save();

            // Bargraphtrack

            // Frame
            ctx.save();
            ctx.lineWidth = size * 0.085;
            ctx.beginPath();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset - 4 * RAD_FACTOR);
            ctx.translate(-centerX, -centerY);
            ctx.arc(centerX, centerY, imageWidth * 0.355140, 0, angleRange + 8 * RAD_FACTOR, false);
            ctx.rotate(-rotationOffset);
            var ledTrackFrameGradient = ctx.createLinearGradient(0, 0.107476 * imageHeight, 0, 0.897195 * imageHeight);
            ledTrackFrameGradient.addColorStop(0, '#000000');
            ledTrackFrameGradient.addColorStop(0.22, '#333333');
            ledTrackFrameGradient.addColorStop(0.76, '#333333');
            ledTrackFrameGradient.addColorStop(1, '#cccccc');
            ctx.strokeStyle = ledTrackFrameGradient;
            ctx.stroke();
            ctx.restore();

            // Main
            ctx.save();
            ctx.lineWidth = size * 0.075;
            ctx.beginPath();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset - 4 * RAD_FACTOR);
            ctx.translate(-centerX, -centerY);
            ctx.arc(centerX, centerY, imageWidth * 0.355140, 0, angleRange + 8 * RAD_FACTOR, false);
            ctx.rotate(-rotationOffset);
            var ledTrackMainGradient = ctx.createLinearGradient(0, 0.112149 * imageHeight, 0, 0.892523 * imageHeight);
            ledTrackMainGradient.addColorStop(0, '#111111');
            ledTrackMainGradient.addColorStop(1, '#333333');
            ctx.strokeStyle = ledTrackMainGradient;
            ctx.stroke();
            ctx.restore();

            // Draw inactive leds
            var ledCenterX = (imageWidth * 0.116822 + imageWidth * 0.060747) / 2;
            var ledCenterY = (imageWidth * 0.485981 + imageWidth * 0.023364) / 2;
            var ledOffGradient = ctx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, 0.030373 * imageWidth);
            ledOffGradient.addColorStop(0, '#3c3c3c');
            ledOffGradient.addColorStop(1, '#323232');

            for (var angle = 0; angle <= degAngleRange; angle += 5) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate((angle * RAD_FACTOR) + bargraphOffset);
                ctx.translate(-centerX, -centerY);
                ctx.beginPath();
                ctx.rect(imageWidth * 0.116822, imageWidth * 0.485981, imageWidth * 0.060747, imageWidth * 0.023364);
                ctx.closePath();
                ctx.fillStyle = ledOffGradient;
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        };

        var drawActiveLed = function(ctx, color) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.closePath();
            var ledCenterX = (ctx.canvas.width / 2);
            var ledCenterY = (ctx.canvas.height / 2);
            var ledGradient = mainCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, ctx.canvas.width / 2);
            ledGradient.addColorStop(0, color.light.getRgbaColor());
            ledGradient.addColorStop(1, color.dark.getRgbaColor());
            ctx.fillStyle = ledGradient;
            ctx.fill();
            ctx.restore();
        };

        var drawLcdText = function(value) {

            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageWidth * 0.007;
                mainCtx.shadowOffsetY = imageWidth * 0.007;
                mainCtx.shadowBlur = imageWidth * 0.007;
            }

            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            mainCtx.fillText(value.toFixed(lcdDecimals), lcdPosX + lcdWidth - lcdWidth *0.05, lcdPosY + lcdHeight * 0.5 + lcdFontHeight * 0.38, lcdWidth * 0.9);

            mainCtx.restore();
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = Math.ceil(imageWidth * 0.04);
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            var alpha = rotationOffset;      // Tracks total rotation
            var rotationStep = angleStep * minorTickSpacing;
            var textRotationAngle;

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;

            var TEXT_TRANSLATE_X = imageWidth * 0.28;
            var TEXT_WIDTH = imageWidth * 0.1;
            if (gaugeType.type === 'type1' || gaugeType.type === 'type2') {
                TEXT_WIDTH = imageWidth * 0.0375;
            }
            var MAX_VALUE_ROUNDED = parseFloat(maxValue.toFixed(2));

            for (var i = minValue; parseFloat(i.toFixed(2)) <= MAX_VALUE_ROUNDED; i += minorTickSpacing) {
                textRotationAngle = + rotationStep + HALF_PI;
                majorTickCounter++;
                // Draw major tickmarks
                if (majorTickCounter === maxNoOfMinorTicks) {
                    ctx.save();
                    ctx.translate(TEXT_TRANSLATE_X, 0);
                    switch(tickLabelOrientation.type) {
                        case 'horizontal':
                            textRotationAngle = -alpha;
                            break;
                        case 'tangent':
                            textRotationAngle = (alpha <= HALF_PI + Math.PI ? Math.PI : 0);
                            break;
                        case 'normal':
                        default:
                            textRotationAngle = HALF_PI;
                            break;
                    }
                    ctx.rotate(textRotationAngle);
                    switch(labelNumberFormat.format) {
                        case 'fractional':
                            ctx.fillText((valueCounter.toFixed(fractionalScaleDecimals)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'scientific':
                            ctx.fillText((valueCounter.toPrecision(2)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'standard':
                        default:
                            ctx.fillText((valueCounter.toFixed(0)), 0, 0, TEXT_WIDTH);
                            break;
                    }
                    ctx.translate(-TEXT_TRANSLATE_X, 0);
                    ctx.restore();

                    valueCounter += majorTickSpacing;
                    majorTickCounter = 0;
                    ctx.rotate(rotationStep);
                    alpha += rotationStep;
                    continue;
                }
                ctx.rotate(rotationStep);
                alpha += rotationStep;
            }

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(toggleAndRepaintLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };

        var toggleAndRepaintLed = function() {
            if (ledVisible) {
                if (ledBuffer === ledBufferOn) {
                    ledBuffer = ledBufferOff;
                } else {
                    ledBuffer = ledBufferOn;
                }

                mainCtx.drawImage(ledBuffer, LED_POS_X, LED_POS_Y);

            }
        };

        //********************************* Public methods *********************************
        this.setValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                value = targetValue;

                if (value >= threshold && !ledBlinking) {
                    ledBlinking = true;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.play();
                    }
                } else if (value < threshold) {
                    ledBlinking = false;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.pause();
                    }
                }

                this.repaint();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                if (undefined !== tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, this.value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    if (value >= threshold && !ledBlinking) {
                        ledBlinking = true;
                        blink(ledBlinking);
                    } else if (value < threshold) {
                        ledBlinking = false;
                        blink(ledBlinking);
                    }

                    gauge.repaint();
                };
                tween.start();
            }
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({background: true,
                          led: true});
            backgroundColor = newBackgroundColor;
            init({background: true,
                  led: true});
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setValueColor = function(newValueColor) {
            resetBuffers({value: true});
            valueColor = newValueColor;
            init({value: true});
            this.repaint();
        };

        this.setLedColor = function(newLedColor) {
            resetBuffers({led: true});
            ledColor = newLedColor;
            init({led: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.setSection = function(areaSec) {
                section = areaSec;
                init();
                this.repaint();
        };

        this.setSectionActive = function(value) {
            useSectionColors = value;
            init();
            this.repaint();
        };

        this.setGradient = function(grad) {
            valueGradient = grad;
            init();
            this.repaint();
        };

        this.setGradientActive = function(value) {
            useGradient = value;
            init();
            this.repaint();
        };

        this.setMinValue = function(value) {
            minValue = value;
            init({background: true});
            this.repaint();
        };

        this.getMinValue = function(){
            return minValue;
        };

        this.setMaxValue = function(value){
            maxValue = value;
            init({background: true});
            this.repaint();
        };

        this.getMaxValue = function(){
            return maxValue;
        };

        this.setThreshold = function(newValue) {
            var targetValue = newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue);
            threshold = targetValue;
            init({background: true});
            this.repaint();
        };

        this.setTitleString = function(title){
            titleString = title;
            init({background: true});
            this.repaint();
        };

        this.setUnitString = function(unit){
            unitString = unit;
            init({background: true});
            this.repaint();
        };

        this.setTrend = function(newValue) {
            trendIndicator = newValue;
            this.repaint();
        };

        this.setTrendVisible = function(visible) {
            trendVisible = visible;
            this.repaint();
        };

        this.repaint = function() {

            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      value: true,
                      trend: true,
                      foreground: true});
            }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame image
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            mainCtx.drawImage(backgroundBuffer, 0, 0);

            // Draw active leds
            var activeLedAngle = ((value + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange;
            var activeLedColor;
            var lastActiveLedColor = valueColor;
            for (var angle = 0; angle <= activeLedAngle; angle += 5) {
                //check for LED color
                activeLedColor = valueColor;
                // Use a gradient for value colors?
                if (isGradientVisible) {
                    // Convert angle back to value
                    var currentValue = minValue + (angle / degAngleRange) * (maxValue - minValue);
                    var gradRange = valueGradient.getEnd() - valueGradient.getStart();
                    var fraction = currentValue / gradRange;
                    fraction = Math.max(Math.min(fraction, 1),0);
                    activeLedColor = customColorDef(valueGradient.getColorAt(fraction).getRgbaColor());
                } else if (isSectionsVisible) {
                    for (var i =0; i < sectionAngles.length; i++) {
                        if (angle >= sectionAngles[i].start && angle < sectionAngles[i].stop) {
                            activeLedColor = sectionAngles[i].color;
                            break;
                        }
                    }
                }
                // Has LED color changed? If so redraw the buffer
                if (lastActiveLedColor.medium.getHexColor() != activeLedColor.medium.getHexColor()) {
                    drawActiveLed(activeLedContext, activeLedColor);
                    lastActiveLedColor = activeLedColor;
                }
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate((angle * RAD_FACTOR) + bargraphOffset);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(activeLedBuffer, ACTIVE_LED_POS_X, ACTIVE_LED_POS_Y);
                mainCtx.restore();
            }

            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(value);
            }

            // Draw led
            if (ledVisible) {
                if (value < threshold) {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, LED_POS_X, LED_POS_Y);
            }

            // Draw the trend indicator
            if (trendVisible){
                switch (trendIndicator.state) {
                    case 'up':
                        mainCtx.drawImage(trendUpBuffer, trendPosX, trendPosY);
                        break;
                    case 'steady':
                        mainCtx.drawImage(trendSteadyBuffer, trendPosX, trendPosY);
                        break;
                    case 'down':
                        mainCtx.drawImage(trendDownBuffer, trendPosX, trendPosY);
                        break;
                    case 'off':
                        mainCtx.drawImage(trendOffBuffer, trendPosX, trendPosY);
                        break;
                }
            }

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var radialVertical = function(canvas, parameters) {
        parameters = parameters || {};
        var orientation = (undefined === parameters.orientation ? steelseries.Orientation.NORTH : parameters.orientation);
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var minValue = (undefined === parameters.minValue ? 0 : parameters.minValue);
        var maxValue = (undefined === parameters.maxValue ? (minValue + 100) : parameters.maxValue);
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var section = (undefined === parameters.section ? null : parameters.section);
        var area = (undefined === parameters.area ? null : parameters.area);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var pointerType = (undefined === parameters.pointerType ? steelseries.PointerType.TYPE1 : parameters.pointerType);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);
        var ledVisible = (undefined === parameters.ledVisible ? true : parameters.ledVisible);
        var thresholdVisible = (undefined === parameters.thresholdVisible ? true : parameters.thresholdVisible);
        var minMeasuredValueVisible = (undefined === parameters.minMeasuredValueVisible ? false : parameters.minMeasuredValueVisible);
        var maxMeasuredValueVisible = (undefined === parameters.maxMeasuredValueVisible ? false : parameters.maxMeasuredValueVisible);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);

        // Create audio tag for alarm sound
        if (playAlarm && alarmSound !== false) {
            var audioElement = doc.createElement('audio');
            audioElement.setAttribute('src', alarmSound);
            audioElement.setAttribute('preload', 'auto');
        }
        var gaugeType = steelseries.GaugeType.TYPE5;

        var self = this;
        var value = minValue;

        // Properties
        var minMeasuredValue = maxValue;
        var maxMeasuredValue = minValue;

        var ledBlinking = false;

        var ledTimerId = 0;
        var tween;

        var angle = rotationOffset + (value - minValue) * angleStep;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight * 0.733644;

        // Misc
        var ledPosX = 0.455 * imageWidth;
        var ledPosY = 0.51 * imageHeight;

        // Constants
        var HALF_PI = Math.PI / 2;
        var RAD_FACTOR = Math.PI / 180;

        var freeAreaAngle = 0;
        var rotationOffset = 1.25 * Math.PI;
        var tickmarkOffset = 1.25 * Math.PI;
        var angleRange = HALF_PI;
        var angleStep = angleRange / range;

        var initialized = false;

        // Tickmark specific private variables
        var niceMinValue = minValue;
        var niceMaxValue = maxValue;
        var niceRange = maxValue - minValue;
        var range = niceMaxValue - niceMinValue;
        var minorTickSpacing = 0;
        var majorTickSpacing = 0;
        var maxNoOfMinorTicks = 10;
        var maxNoOfMajorTicks = 10;

        // Method to calculate nice values for min, max and range for the tickmarks
        var calculate = function calculate() {
            if (niceScale) {
                niceRange = calcNiceNumber(maxValue - minValue, false);
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                niceMinValue = Math.floor(minValue / majorTickSpacing) * majorTickSpacing;
                niceMaxValue = Math.ceil(maxValue / majorTickSpacing) * majorTickSpacing;
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
                minValue = niceMinValue;
                maxValue = niceMaxValue;
                range = maxValue - minValue;
            }
            else {
                niceRange = (maxValue - minValue);
                niceMinValue = minValue;
                niceMaxValue = maxValue;
                range = niceRange;
                minorTickSpacing = 1;
                majorTickSpacing = 10;
            }

            freeAreaAngle = 0;
            rotationOffset = 1.25 * Math.PI;
            tickmarkOffset = 1.25 * Math.PI;
            angleRange = HALF_PI;
            angleStep = angleRange / range;

            angle = rotationOffset + (value - minValue) * angleStep;
        };

        // **************   Buffer creation  ********************
        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for the background
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(size * 0.093457, size * 0.093457);
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(size * 0.093457, size * 0.093457);
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.028037), Math.ceil(size * 0.028037));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.028037), Math.ceil(size * 0.028037));
        var maxMeasuredValueCtx = maxMeasuredValueBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var pointerBuffer = createBuffer(size, size);
        var pointerContext = pointerBuffer.getContext('2d');

        // Buffer for pointer shadow
        var pointerShadowBuffer = createBuffer(size, size);
        var pointerShadowContext = pointerShadowBuffer.getContext('2d');

        // Buffer for pointer shadow rotation
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawPostsImage = function(ctx) {
            if ('type5' === gaugeType.type) {
                ctx.save();
                switch(orientation.type) {
                    case 'west':
                        // Min post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.44, imageHeight * 0.80);

                        // Max post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.44, imageHeight * 0.16);
                        break;

                    default:
                        // Min post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.2 - imageHeight * 0.037383, imageHeight * 0.446666);

                        // Max post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.037383), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.8, imageHeight * 0.446666);
                        break;
                }
                ctx.restore();
            }
        };

        var createThresholdImage = function() {
            var thresholdBuffer = doc.createElement('canvas');
            thresholdBuffer.width = Math.ceil(size * 0.046728);
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0, '#520000');
            gradThreshold.addColorStop(0.3, '#fc1d00');
            gradThreshold.addColorStop(0.59, '#fc1d00');
            gradThreshold.addColorStop(1, '#520000');
            thresholdCtx.fillStyle = gradThreshold;

            thresholdCtx.beginPath();
            thresholdCtx.moveTo(thresholdBuffer.width * 0.5, 0.1);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.9, thresholdBuffer.height * 0.9);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.1, thresholdBuffer.height * 0.9);
            thresholdCtx.lineTo(thresholdBuffer.width * 0.5, 0.1);
            thresholdCtx.closePath();

            thresholdCtx.fill();
            thresholdCtx.strokeStyle = '#FFFFFF';
            thresholdCtx.stroke();

            thresholdCtx.restore();

            return thresholdBuffer;
        };

        var drawAreaSectionImage = function(ctx, start, stop, color, filled) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = imageWidth * 0.035;
            var startAngle = (angleRange / range * start - angleRange / range * minValue);
            var stopAngle = startAngle + (stop - start) / (range / angleRange);
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            ctx.beginPath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, imageWidth * 0.365 - ctx.lineWidth / 2, startAngle, stopAngle, false);
            } else {
                ctx.arc(0, 0, imageWidth * 0.365, startAngle, stopAngle, false);
            }
//            ctx.closePath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.fill();
            } else {
                ctx.stroke();
            }

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawTitleImage = function(ctx) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            var baseSize = imageWidth;
            if (!radial && !vertical) {
                baseSize = imageHeight;
            }

            ctx.font = 0.046728 * imageWidth + 'px sans-serif';
            var titleWidth = ctx.measureText(titleString).width;
            ctx.fillText(titleString, (imageWidth - titleWidth) / 2, imageHeight * 0.4, imageWidth * 0.3);
            var unitWidth = ctx.measureText(unitString).width;
            ctx.fillText(unitString, (imageWidth - unitWidth) / 2, imageHeight * 0.47, imageWidth * 0.2);

            ctx.restore();
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1);
            ctx.save();

            if (steelseries.Orientation.WEST === orientation) {
                ctx.translate(centerX, centerX);
                ctx.rotate(-Math.PI / 2);
                ctx.translate(-centerX, -centerX);
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = Math.ceil(imageWidth * 0.04);
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            var rotationStep = angleStep * minorTickSpacing;
            var textRotationAngle;

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;

            var OUTER_POINT = imageWidth * 0.44;
            var MAJOR_INNER_POINT = imageWidth * 0.41;
            var MED_INNER_POINT = imageWidth * 0.415;
            var MINOR_INNER_POINT = imageWidth * 0.42;
            var TEXT_TRANSLATE_X = imageWidth * 0.48;
            var TEXT_WIDTH = imageWidth * 0.0375;
            var HALF_MAX_NO_OF_MINOR_TICKS = maxNoOfMinorTicks / 2;
            var MAX_VALUE_ROUNDED = parseFloat(maxValue.toFixed(2));

            for (var i = minValue; parseFloat(i.toFixed(2)) <= MAX_VALUE_ROUNDED; i += minorTickSpacing) {
                textRotationAngle = + rotationStep + HALF_PI;
                majorTickCounter++;
                // Draw major tickmarks
                if (majorTickCounter === maxNoOfMinorTicks) {
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MAJOR_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.save();
                    ctx.translate(TEXT_TRANSLATE_X, 0);
                    ctx.rotate(textRotationAngle);
                    switch(labelNumberFormat.format) {

                        case 'fractional':
                            ctx.fillText((valueCounter.toFixed(2)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'scientific':
                            ctx.fillText((valueCounter.toPrecision(2)), 0, 0, TEXT_WIDTH);
                            break;

                        case 'standard':
                        default:
                            ctx.fillText((valueCounter.toFixed(0)), 0, 0, TEXT_WIDTH);
                            break;
                    }
                    ctx.translate(-TEXT_TRANSLATE_X, 0);
                    ctx.restore();

                    valueCounter += majorTickSpacing;
                    majorTickCounter = 0;
                    ctx.rotate(rotationStep);
                    continue;
                }

                // Draw tickmark every minor tickmark spacing
                if (0 === maxNoOfMinorTicks % 2 && majorTickCounter === (HALF_MAX_NO_OF_MINOR_TICKS)) {
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MED_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(OUTER_POINT, 0);
                    ctx.lineTo(MINOR_INNER_POINT, 0);
                    ctx.closePath();
                    ctx.stroke();
                }
                ctx.rotate(rotationStep);
            }

            /*
             // Logarithmic scale
             var tmp = 0.1;
             var minValueLog10 = 0.1;
             var maxValueLog10 = parseInt(Math.pow(10, Math.ceil(Math.log10(maxValue))));
             var drawLabel = true;
             angleStep = angleRange / (maxValueLog10 - minValueLog10)
             for (var scaleFactor = minValueLog10 ; scaleFactor <= maxValueLog10 ; scaleFactor *= 10)
             {
             for (var i = parseFloat((1 * scaleFactor).toFixed(1)) ; i < parseFloat((10 * scaleFactor).toFixed(1)) ; i += scaleFactor)
             {
             textRotationAngle =+ rotationStep + Math.PI / 2;

             if(drawLabel)
             {
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.moveTo(imageWidth * 0.38,0);
             ctx.lineTo(imageWidth * 0.35,0);
             ctx.closePath();
             ctx.stroke();
             ctx.save();
             ctx.translate(imageWidth * 0.31, 0);
             ctx.rotate(textRotationAngle);
             ctx.fillText(parseFloat((i).toFixed(1)), 0, 0, imageWidth * 0.0375);
             ctx.translate(-imageWidth * 0.31, 0);
             ctx.restore();
             drawLabel = false;
             }
             else
             {
             ctx.lineWidth = 0.5;
             ctx.beginPath();
             ctx.moveTo(imageWidth * 0.38,0);
             ctx.lineTo(imageWidth * 0.36,0);
             ctx.closePath();
             ctx.stroke();
             }
             //doc.write("log10 scale value: " + parseFloat((i).toFixed(1)) + "<br>");
             //Math.log10(parseFloat((i).toFixed(1)));

             ctx.rotate(rotationStep);
             }
             tmp = 0.1;
             drawLabel = true;
             }
             */

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawLed = (undefined === parameters.led ? false : parameters.led);
            var drawPointer = (undefined === parameters.pointer ? false : parameters.pointer);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            // Calculate the current min and max values and the range
            calculate();

            // Create frame in frame buffer (backgroundBuffer)
            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, size / 2, imageWidth, imageHeight);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, size/2, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(Math.ceil(size * 0.093457), 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(Math.ceil(size * 0.093457), 0, ledColor), 0, 0);
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.028037), steelseries.ColorDef.BLUE.dark.getRgbaColor(), true, true), 0, 0);
                minMeasuredValueCtx.restore();
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.028037), steelseries.ColorDef.RED.medium.getRgbaColor(), true), 0, 0);
                maxMeasuredValueCtx.restore();
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawPostsImage(backgroundContext);

                // Create section in background buffer (backgroundBuffer)
                if (null !== section && 0 < section.length) {
                    backgroundContext.save();
                    if (steelseries.Orientation.WEST === orientation) {
                        backgroundContext.translate(centerX, centerX);
                        backgroundContext.rotate(-Math.PI / 2);
                        backgroundContext.translate(-centerX, -centerX);
                    }
                    var sectionIndex = section.length;
                    do {
                        sectionIndex--;
                        drawAreaSectionImage(backgroundContext, section[sectionIndex].start, section[sectionIndex].stop, section[sectionIndex].color, false);
                    }
                    while (0 < sectionIndex);
                    backgroundContext.restore();
                }

                // Create area in background buffer (backgroundBuffer)
                if (null !== area && 0 < area.length) {
                    if (steelseries.Orientation.WEST === orientation) {
                        backgroundContext.translate(centerX, centerX);
                        backgroundContext.rotate(-Math.PI / 2);
                        backgroundContext.translate(-centerX, -centerX);
                    }
                    var areaIndex = area.length;
                    do {
                        areaIndex--;
                        drawAreaSectionImage(backgroundContext, area[areaIndex].start, area[areaIndex].stop, area[areaIndex].color, true);
                    }
                    while (0 < areaIndex);
                    backgroundContext.restore();
                }

                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat);

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext);
            }

            // Draw threshold image to background context
            if (thresholdVisible) {
                backgroundContext.save();
                if (steelseries.Orientation.WEST === orientation) {
                    backgroundContext.translate(centerX, centerX);
                    backgroundContext.rotate(-Math.PI / 2);
                    backgroundContext.translate(-centerX, -centerX);
                }
                backgroundContext.translate(centerX, centerY);
                backgroundContext.rotate(rotationOffset + (threshold - minValue) * angleStep + HALF_PI);
                backgroundContext.translate(-centerX, -centerY);
                backgroundContext.drawImage(createThresholdImage(), imageWidth * 0.475, imageHeight * 0.32);
                backgroundContext.restore();
            }

            // Create pointer image in pointer buffer (contentBuffer)
            if (drawPointer) {
                drawPointerImage(pointerContext, imageWidth*1.17, pointerType, pointerColor, backgroundColor.labelColor, false);
                drawPointerImage(pointerShadowContext, imageWidth*1.17, pointerType, pointerColor, backgroundColor.labelColor, true);

            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground && foregroundVisible) {
                var knobVisible = (pointerType.type === 'type15' || pointerType.type === 'type16' ? false : true);
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, knobVisible, knobType, knobStyle, gaugeType, orientation);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetLed = (undefined === buffers.led ? false : buffers.led);
            var resetPointer = (undefined === buffers.pointer ? false : buffers.pointer);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if (resetLed) {
                ledBufferOn.width = Math.ceil(size * 0.093457);
                ledBufferOn.height = Math.ceil(size * 0.093457);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(size * 0.093457);
                ledBufferOff.height = Math.ceil(size * 0.093457);
                ledContextOff = ledBufferOff.getContext('2d');

                // Buffer for current led painting code
                ledBuffer = ledBufferOff;
            }

            if (resetPointer) {
                pointerBuffer.width = size;
                pointerBuffer.height = size;
                pointerContext = pointerBuffer.getContext('2d');

                pointerShadowBuffer.width = size;
                pointerShadowBuffer.height = size;
                pointerShadowContext = pointerShadowBuffer.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
            }

            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(toggleAndRepaintLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };

        var toggleAndRepaintLed = function() {
            if (ledVisible) {
                if (ledBuffer === ledBufferOn) {
                    ledBuffer = ledBufferOff;
                } else {
                    ledBuffer = ledBufferOn;
                }

                self.repaint();
            }
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                value = targetValue;

                if (value > maxMeasuredValue) {
                    maxMeasuredValue = value;
                }
                if (value < minMeasuredValue) {
                    minMeasuredValue = value;
                }

                if (value >= threshold && !ledBlinking) {
                    ledBlinking = true;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.play();
                    }
                } else if (value < threshold) {
                    ledBlinking = false;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.pause();
                    }
                }

                this.repaint();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                if (undefined !==  tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }
                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    if (value >= threshold && !ledBlinking) {
                        ledBlinking = true;
                        blink(ledBlinking);
                    } else if (value < threshold) {
                        ledBlinking = false;
                        blink(ledBlinking);
                    }

                    if (value > maxMeasuredValue) {
                        maxMeasuredValue = value;
                    }
                    if (value < minMeasuredValue) {
                        minMeasuredValue = value;
                    }

                    gauge.repaint();
                };

                tween.start();
            }
        };

        this.resetMinMeasuredValue = function() {
            minMeasuredValue = value;
            this.repaint();
        };

        this.resetMaxMeasuredValue = function() {
            maxMeasuredValue = value;
            this.repaint();
        };

        this.setMinMeasuredValueVisible = function(visible) {
            minMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setMaxMeasuredValueVisible = function(visible) {
            maxMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setThresholdVisible = function(visible) {
            thresholdVisible = visible;
            this.repaint();
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({background: true,
                          pointer: true   //type2 depends on background
                          });
            backgroundColor = newBackgroundColor;
            init({
                background: true,
                pointer: true //type2 depends on background
                });
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setPointerType = function(newPointerType) {
            resetBuffers({pointer: true,
                          foreground: true  // Required as type15 does not need a knob
                         });
            pointerType = newPointerType;
            init({pointer: true,
                  foreground: true
                 });
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers({pointer: true});
            pointerColor = newPointerColor;
            init({pointer: true});
            this.repaint();
        };

        this.setLedColor = function(newLedColor) {
            resetBuffers({led: true});
            ledColor = newLedColor;
            init({led: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointer: true,
                      foreground: true});
            }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
            mainCtx.save();

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
             mainCtx.drawImage(backgroundBuffer, 0, 0);

            // Draw led
            if (ledVisible) {
                if (value < threshold) {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, ledPosX, ledPosY);
            }

            if (steelseries.Orientation.WEST === orientation) {
                mainCtx.translate(centerX, centerX);
                mainCtx.rotate(-Math.PI / 2);
                mainCtx.translate(-centerX, -centerX);
            }

            // Draw min measured value indicator
            if (minMeasuredValueVisible) {
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate(rotationOffset + HALF_PI + (minMeasuredValue - minValue) * angleStep);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(minMeasuredValueBuffer, mainCtx.canvas.width * 0.4865, mainCtx.canvas.height * 0.27);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate(rotationOffset + HALF_PI + (maxMeasuredValue - minValue) * angleStep);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(maxMeasuredValueBuffer, mainCtx.canvas.width * 0.4865, mainCtx.canvas.height * 0.27);
                mainCtx.restore();
            }

            angle = rotationOffset + HALF_PI + (value - minValue) * angleStep;

            // we have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angle);
            pointerRotContext.translate(-imageWidth * 1.17 /2 , -imageWidth * 1.17 /2);
            pointerRotContext.drawImage(pointerShadowBuffer, 0, 0);
            pointerRotContext.restore();
            if (steelseries.Orientation.NORTH === orientation) {
                mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);
            } else {
                mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, -shadowOffset, shadowOffset, imageWidth - shadowOffset, imageHeight + shadowOffset);
            }

            mainCtx.save();

            // Define rotation center
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angle);

            // Draw pointer
            mainCtx.translate(-imageWidth * 1.17 /2 , -imageWidth * 1.17 /2);
            mainCtx.drawImage(pointerBuffer, 0, 0);
            mainCtx.restore();

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.save();
                if (steelseries.Orientation.WEST === orientation) {
                    mainCtx.translate(centerX, centerX);
                    mainCtx.rotate(Math.PI / 2);
                    mainCtx.translate(-centerX, -centerX);
                }
                mainCtx.drawImage(foregroundBuffer, 0, 0);
                mainCtx.restore();
            }
            mainCtx.restore();
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var linear = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 140 : parameters.width);
        var height = (undefined === parameters.height ? 320 : parameters.height);
        var minValue = (undefined === parameters.minValue ? 0 : parameters.minValue);
        var maxValue = (undefined === parameters.maxValue ? (minValue + 100) : parameters.maxValue);
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var valueColor = (undefined === parameters.valueColor ? steelseries.ColorDef.RED : parameters.valueColor);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);
        var ledVisible = (undefined === parameters.ledVisible ? true : parameters.ledVisible);
        var thresholdVisible = (undefined === parameters.thresholdVisible ? true : parameters.thresholdVisible);
        var minMeasuredValueVisible = (undefined === parameters.minMeasuredValueVisible ? false : parameters.minMeasuredValueVisible);
        var maxMeasuredValueVisible = (undefined === parameters.maxMeasuredValueVisible ? false : parameters.maxMeasuredValueVisible);
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);

        // Create audio tag for alarm sound
        if (playAlarm && alarmSound !== false) {
            var audioElement = doc.createElement('audio');
            audioElement.setAttribute('src', alarmSound);
            //audioElement.setAttribute('src', 'js/alarm.mp3');
            audioElement.setAttribute('preload', 'auto');
        }

        var self = this;
        var value = minValue;

        // Properties
        var minMeasuredValue = maxValue;
        var maxMeasuredValue = minValue;

        var tween;
        var ledBlinking = false;

        var ledTimerId = 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;

        var imageWidth = width;
        var imageHeight = height;

        var vertical = width <= height;

        // Constants
        var ledPosX;
        var ledPosY;
        var stdFont;
        var lcdFont;

        // Misc
        if (vertical) {
            ledPosX = 0.453271 * imageWidth;
            ledPosY = (18 / imageHeight) * imageHeight;
            stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageWidth / 10) + 'px ' + lcdFontName;
        } else {
            ledPosX = 0.89 * imageWidth;
            ledPosY = 0.453271 * imageHeight;
            stdFont = Math.floor(imageHeight / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageHeight / 10) + 'px ' + lcdFontName;
        }

        var initialized = false;

        // Tickmark specific private variables
        var niceMinValue = minValue;
        var niceMaxValue = maxValue;
        var niceRange = maxValue - minValue;
        var range = niceMaxValue - niceMinValue;
        var minorTickSpacing = 0;
        var majorTickSpacing = 0;
        var maxNoOfMinorTicks = 10;
        var maxNoOfMajorTicks = 10;

        // Method to calculate nice values for min, max and range for the tickmarks
        var calculate = function calculate() {
            if (niceScale) {
                niceRange = calcNiceNumber(maxValue - minValue, false);
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                niceMinValue = Math.floor(minValue / majorTickSpacing) * majorTickSpacing;
                niceMaxValue = Math.ceil(maxValue / majorTickSpacing) * majorTickSpacing;
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
                minValue = niceMinValue;
                maxValue = niceMaxValue;
                range = maxValue - minValue;
            } else {
                niceRange = (maxValue - minValue);
                niceMinValue = minValue;
                niceMaxValue = maxValue;
                range = niceRange;
                minorTickSpacing = 1;
                majorTickSpacing = 10;
            }
        };

        // **************   Buffer creation  ********************
        // Buffer for the frame
        var frameBuffer = createBuffer(width, height);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for the background
        var backgroundBuffer = createBuffer(width, height);
        var backgroundContext = backgroundBuffer.getContext('2d');

        var lcdBuffer;

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(Math.ceil(width * 0.093457), Math.ceil(width * 0.093457));
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(Math.ceil(width * 0.093457), Math.ceil(width * 0.093457));
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.028037), Math.ceil(width * 0.028037));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.028037), Math.ceil(width * 0.028037));
        var maxMeasuredValueCtx = maxMeasuredValueBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(width, height);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawLcdText = function(value, vertical) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.textBaseline = 'middle';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                if (vertical) {
                    mainCtx.shadowOffsetX = imageWidth * 0.007;
                    mainCtx.shadowOffsetY = imageWidth * 0.007;
                    mainCtx.shadowBlur = imageWidth * 0.009;
                } else {
                    mainCtx.shadowOffsetX = imageHeight * 0.007;
                    mainCtx.shadowOffsetY = imageHeight * 0.007;
                    mainCtx.shadowBlur = imageHeight * 0.009;
                }
            }

            var lcdTextX;
            var lcdTextY;
            var lcdTextWidth;

            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }

            if (vertical) {
                lcdTextX = (imageWidth - (imageWidth * 0.571428)) / 2  + imageWidth * 0.571428 - 1;
                lcdTextY = imageHeight * 0.88 + 1 + (imageHeight * 0.055 - 2) / 2;
                lcdTextWidth = imageWidth * 0.7 - 2;
            } else {
                lcdTextX = (imageWidth * 0.695) + imageWidth * 0.18 - 2;
                lcdTextY = (imageHeight * 0.22) + 1 + (imageHeight * 0.15 - 2) / 2;
                lcdTextWidth = imageHeight * 0.22 - 2;
            }

            mainCtx.fillText(value.toFixed(lcdDecimals), lcdTextX, lcdTextY, lcdTextWidth);

            mainCtx.restore();
        };

        var createThresholdImage = function(vertical) {
            var thresholdBuffer = doc.createElement('canvas');
            if (vertical) {
                thresholdBuffer.width = Math.ceil(imageWidth * 0.046728);
            } else {
                thresholdBuffer.width = Math.ceil(imageHeight * 0.046728);
            }
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0, '#520000');
            gradThreshold.addColorStop(0.3, '#fc1d00');
            gradThreshold.addColorStop(0.59, '#fc1d00');
            gradThreshold.addColorStop(1, '#520000');
            thresholdCtx.fillStyle = gradThreshold;

            if (vertical) {
                thresholdCtx.beginPath();
                thresholdCtx.moveTo(0.1, thresholdBuffer.height * 0.5);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, thresholdBuffer.height * 0.9);
                thresholdCtx.closePath();
            } else {
                thresholdCtx.beginPath();
                thresholdCtx.moveTo(0.1, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.5, thresholdBuffer.height * 0.9);
                thresholdCtx.closePath();
            }

            thresholdCtx.fill();
            thresholdCtx.strokeStyle = '#FFFFFF';
            thresholdCtx.stroke();

            thresholdCtx.restore();

            return thresholdBuffer;
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat, vertical) {
            backgroundColor.labelColor.setAlpha(1);
            ctx.save();
            ctx.textBaseline = 'middle';
            var TEXT_WIDTH = imageWidth * 0.1;
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;
            var scaleBoundsX;
            var scaleBoundsY;
            var scaleBoundsW;
            var scaleBoundsH;
            var tickSpaceScaling = 1;

            var minorTickStart;
            var minorTickStop;
            var mediumTickStart;
            var mediumTickStop;
            var majorTickStart;
            var majorTickStop;
            if (vertical) {
                minorTickStart = (0.34 * imageWidth);
                minorTickStop = (0.36 * imageWidth);
                mediumTickStart = (0.33 * imageWidth);
                mediumTickStop = (0.36 * imageWidth);
                majorTickStart = (0.32 * imageWidth);
                majorTickStop = (0.36 * imageWidth);
 //               fontSize = Math.floor(imageWidth * 0.075);
 //               ctx.font = fontSize + 'px sans-serif';
                ctx.textAlign = 'right';
                scaleBoundsX = 0;
                scaleBoundsY = imageHeight * 0.128640;
                scaleBoundsW = 0;
                scaleBoundsH = (imageHeight * 0.856796 - imageHeight * 0.128640);
                tickSpaceScaling = scaleBoundsH / (maxValue - minValue);
            } else {
                minorTickStart = (0.65 * imageHeight);
                minorTickStop = (0.63 * imageHeight);
                mediumTickStart = (0.66 * imageHeight);
                mediumTickStop = (0.63 * imageHeight);
                majorTickStart = (0.67 * imageHeight);
                majorTickStop = (0.63 * imageHeight);
 //               fontSize = Math.floor(imageHeight * 0.075);
 //               ctx.font = fontSize + 'px sans-serif';
                ctx.textAlign = 'center';
                scaleBoundsX = imageWidth * 0.142857;
                scaleBoundsY = 0;
                scaleBoundsW = (imageWidth * 0.871012 - imageWidth * 0.142857);
                scaleBoundsH = 0;
                tickSpaceScaling = scaleBoundsW / (maxValue - minValue);
            }

            for (var labelCounter = minValue, tickCounter = 0; labelCounter <= maxValue; labelCounter += minorTickSpacing, tickCounter += minorTickSpacing) {

                // Calculate the bounds of the scaling
                if (vertical) {
                    currentPos = scaleBoundsY + scaleBoundsH - tickCounter * tickSpaceScaling;
                } else {
                    currentPos = scaleBoundsX + tickCounter * tickSpaceScaling;
                }

                majorTickCounter++;

                // Draw tickmark every major tickmark spacing
                if (majorTickCounter === maxNoOfMinorTicks) {

                    // Draw the major tickmarks
                    ctx.lineWidth = 1.5;
                    drawLinearTicks(ctx, majorTickStart, majorTickStop, currentPos, vertical);

                    // Draw the standard tickmark labels
                    if (vertical) {
                    // Vertical orientation
                    switch(labelNumberFormat.format) {

                        case 'fractional':
                            ctx.fillText((valueCounter.toFixed(2)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;

                        case 'scientific':
                            ctx.fillText((valueCounter.toPrecision(2)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;

                        case 'standard':
                        default:
                            ctx.fillText((valueCounter.toFixed(0)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;
                    }
                } else {
                        // Horizontal orientation
                        switch(labelNumberFormat.format) {

                            case 'fractional':
                                ctx.fillText((valueCounter.toFixed(2)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;

                            case 'scientific':
                                ctx.fillText((valueCounter.toPrecision(2)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;

                            case 'standard':
                            default:
                                ctx.fillText((valueCounter.toFixed(0)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;
                        }
                    }

                    valueCounter += majorTickSpacing;
                    majorTickCounter = 0;
                    continue;
                }

                // Draw tickmark every minor tickmark spacing
                if (0 === maxNoOfMinorTicks % 2 && majorTickCounter === (maxNoOfMinorTicks / 2)) {
                    ctx.lineWidth = 1;
                    drawLinearTicks(ctx, mediumTickStart, mediumTickStop, currentPos, vertical);
                } else {
                    ctx.lineWidth = 0.5;
                    drawLinearTicks(ctx, minorTickStart, minorTickStop, currentPos, vertical);
                }
            }

            ctx.restore();
        };

        var drawLinearTicks = function(ctx, tickStart, tickStop, currentPos, vertical) {
            if (vertical) {
                // Vertical orientation
                ctx.beginPath();
                ctx.moveTo(tickStart, currentPos);
                ctx.lineTo(tickStop, currentPos);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Horizontal orientation
                ctx.beginPath();
                ctx.moveTo(currentPos, tickStart);
                ctx.lineTo(currentPos, tickStop);
                ctx.closePath();
                ctx.stroke();
            }
        };

        // **************   Initialization  ********************
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawLed = (undefined === parameters.led ? false : parameters.led);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            // Calculate the current min and max values and the range
            calculate();

            // Create frame in frame buffer (backgroundBuffer)
            if (drawFrame && frameVisible) {
                drawLinearFrameImage(frameContext, frameDesign, imageWidth, imageHeight, vertical);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawLinearBackgroundImage(backgroundContext, backgroundColor, imageWidth, imageHeight);
            }

            if (drawLed) {
                if (vertical) {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(width * 0.093457), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(width * 0.093457), 0, ledColor), 0, 0);
                } else {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(height * 0.093457), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(height * 0.093457), 0, ledColor), 0, 0);
                }
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                if (vertical) {
                    minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(width * 0.05), steelseries.ColorDef.BLUE.dark.getRgbaColor(), false, vertical), 0, 0);
                } else {
                    minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(height * 0.05), steelseries.ColorDef.BLUE.dark.getRgbaColor(), false, vertical), 0, 0);
                }
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                if (vertical) {
                    maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(width * 0.05), steelseries.ColorDef.RED.medium.getRgbaColor(), false, vertical), 0, 0);
                } else {
                    maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(height * 0.05), steelseries.ColorDef.RED.medium.getRgbaColor(), false, vertical), 0, 0);
                }
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {

                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat, vertical);
                var valuePos;

                // Create title in background buffer (backgroundBuffer)
                if (vertical) {
                    drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, null, lcdVisible);
                } else {
                    drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, null, lcdVisible);
                }
            }

            // Draw threshold image to background context
            if (drawBackground && thresholdVisible) {
                backgroundContext.save();
                if (vertical) {
                    // Vertical orientation
                    valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (threshold / (maxValue - minValue));
                    backgroundContext.translate(imageWidth * 0.435714 - Math.ceil(imageWidth * 0.046728) - 2, valuePos - Math.ceil(imageWidth * 0.046728) / 2);
                } else {
                    // Horizontal orientation
                    valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * threshold / (maxValue - minValue);
                    backgroundContext.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.046728) / 2 + valuePos, imageHeight * 0.571428 + 2);
                }
                backgroundContext.drawImage(createThresholdImage(vertical), 0, 0);
                backgroundContext.restore();
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                if (vertical) {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.571428, imageHeight * 0.055, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, ((imageWidth - (imageWidth * 0.571428)) / 2), imageHeight * 0.88);
                } else {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.18, imageHeight * 0.15, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, imageWidth * 0.695, imageHeight * 0.22);
                }
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground && foregroundVisible) {
                drawLinearForegroundImage(foregroundContext, imageWidth, imageHeight, vertical, false);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetLed = (undefined === buffers.led ? false : buffers.led);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = width;
                frameBuffer.height = height;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = width;
                backgroundBuffer.height = height;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if(resetLed) {
                ledBufferOn.width = Math.ceil(width * 0.093457);
                ledBufferOn.height = Math.ceil(height * 0.093457);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(width * 0.093457);
                ledBufferOff.height = Math.ceil(height * 0.093457);
                ledContextOff = ledBufferOff.getContext('2d');

                // Buffer for current led painting code
                ledBuffer = ledBufferOff;
            }

            if (resetForeground) {
                foregroundBuffer.width = width;
                foregroundBuffer.height = height;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(toggleAndRepaintLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };

        var toggleAndRepaintLed = function() {
            if (ledVisible) {
                if (ledBuffer === ledBufferOn) {
                    ledBuffer = ledBufferOff;
                } else {
                    ledBuffer = ledBufferOn;
                }

                self.repaint();
            }
        };

        var drawValue = function(ctx, imageWidth, imageHeight) {
            var vertical = imageWidth < imageHeight;
            var top; // position of max value
            var bottom; // position of min value
            var labelColor = backgroundColor.labelColor;
            var fullSize;
            var valueSize;
            var valueTop;
            var valueBackgroundStartX;
            var valueBackgroundStartY;
            var valueBackgroundStopX;
            var valueBackgroundStopY;
            var valueBorderStartX;
            var valueBorderStartY;
            var valueBorderStopX;
            var valueBorderStopY;
            var valueForegroundStartX;
            var valueForegroundStartY;
            var valueForegroundStopX;
            var valueForegroundStopY;

            // Orientation dependend definitions
            if (vertical) {
                // Vertical orientation
                top =  imageHeight * 0.128640; // position of max value
                bottom = imageHeight * 0.856796; // position of min value
                fullSize = bottom - top;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = top + fullSize - valueSize;
                valueBackgroundStartX = 0;
                valueBackgroundStartY = top;
                valueBackgroundStopX = 0;
                valueBackgroundStopY = top + fullSize;
            } else {
                // Horizontal orientation
                top = imageWidth * 0.856796; // position of max value
                bottom = imageWidth * 0.142857; // position of min value
                fullSize = top - imageWidth * 0.128640;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = bottom;
                valueBackgroundStartX = top;
                valueBackgroundStartY = 0;
                valueBackgroundStopX = bottom;
                valueBackgroundStopY = 0;
            }
            var darker = (backgroundColor === steelseries.BackgroundColor.CARBON ||
                          backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET ||
                          backgroundColor === steelseries.BackgroundColor.STAINLESS ||
                          backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS ||
                          backgroundColor === steelseries.BackgroundColor.TURNED) ? 0.3 : 0;
            var valueBackgroundTrackGradient = ctx.createLinearGradient(valueBackgroundStartX, valueBackgroundStartY, valueBackgroundStopX, valueBackgroundStopY);
            labelColor.setAlpha(0.05 + darker);
            valueBackgroundTrackGradient.addColorStop(0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.15 + darker);
            valueBackgroundTrackGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.15 + darker);
            valueBackgroundTrackGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.05 + darker);
            valueBackgroundTrackGradient.addColorStop(1, labelColor.getRgbaColor());
            ctx.fillStyle = valueBackgroundTrackGradient;

            if (vertical) {
                ctx.fillRect(imageWidth * 0.435714, top, imageWidth * 0.142857, fullSize);
            } else {
                ctx.fillRect(imageWidth * 0.142857, imageHeight * 0.435714, fullSize, imageHeight * 0.142857);
            }

            if (vertical) {
                // Vertical orientation
                valueBorderStartX = 0;
                valueBorderStartY = top;
                valueBorderStopX = 0;
                valueBorderStopY = top + fullSize;
            } else {
                // Horizontal orientation
                valueBorderStartX = imageWidth * 0.142857 + fullSize;
                valueBorderStartY = 0;
                valueBorderStopX = imageWidth * 0.142857;
                valueBorderStopY = 0;
            }
            var valueBorderGradient = ctx.createLinearGradient(valueBorderStartX, valueBorderStartY, valueBorderStopX, valueBorderStopY);
            labelColor.setAlpha(0.3 + darker);
            valueBorderGradient.addColorStop(0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.69);
            valueBorderGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.7);
            valueBorderGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.4);
            valueBorderGradient.addColorStop(1, labelColor.getRgbaColor());
            ctx.fillStyle = valueBorderGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.435714, top, imageWidth * 0.007142, fullSize);
                ctx.fillRect(imageWidth * 0.571428, top, imageWidth * 0.007142, fullSize);
            } else {
                ctx.fillRect(imageWidth * 0.142857, imageHeight * 0.435714, fullSize, imageHeight * 0.007142);
                ctx.fillRect(imageWidth * 0.142857, imageHeight * 0.571428, fullSize, imageHeight * 0.007142);
            }

            if (vertical) {
                // Vertical orientation
                valueStartX = imageWidth * 0.45;
                valueStartY = 0;
                valueStopX = imageWidth * 0.45 + imageWidth * 0.114285;
                valueStopY = 0;
            } else {
                // Horizontal orientation
                valueStartX = 0;
                valueStartY = imageHeight * 0.45;
                valueStopX = 0;
                valueStopY = imageHeight * 0.45 + imageHeight * 0.114285;
            }

            var valueBackgroundGradient = ctx.createLinearGradient(valueStartX, valueStartY, valueStopX, valueStopY);
            valueBackgroundGradient.addColorStop(0, valueColor.medium.getRgbaColor());
            valueBackgroundGradient.addColorStop(0.99, valueColor.light.getRgbaColor());
            valueBackgroundGradient.addColorStop(1, valueColor.light.getRgbaColor());
            ctx.fillStyle = valueBackgroundGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.45, valueTop, imageWidth * 0.114285, valueSize);
            } else {
                ctx.fillRect(valueTop, imageHeight * 0.45, valueSize, imageHeight * 0.114285);
            }

            // The lighteffect on the value
            if (vertical){
                // Vertical orientation
                valueForegroundStartX = imageWidth * 0.45;
                valueForegroundStartY = 0;
                valueForegroundStopX = imageWidth * 0.45 + imageWidth * 0.05;
                valueForegroundStopY = 0;
            } else {
                // Horizontal orientation
                valueForegroundStartX = 0;
                valueForegroundStartY = imageHeight * 0.45;
                valueForegroundStopX = 0;
                valueForegroundStopY = imageHeight * 0.45 + imageHeight * 0.05;
            }
            var valueForegroundGradient = ctx.createLinearGradient(valueForegroundStartX, valueForegroundStartY, valueForegroundStopX, valueForegroundStopY);
            valueForegroundGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            valueForegroundGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            ctx.fillStyle = valueForegroundGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.45, valueTop, imageWidth * 0.05, valueSize);
            } else {
                ctx.fillRect(valueTop, imageHeight * 0.45, valueSize, imageHeight * 0.05);
            }
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                value = targetValue;

                if (value > maxMeasuredValue) {
                    maxMeasuredValue = value;
                }
                if (value < minMeasuredValue) {
                    minMeasuredValue = value;
                }

                if (value >= threshold && !ledBlinking) {
                    ledBlinking = true;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.play();
                    }
                } else if (value < threshold) {
                    ledBlinking = false;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.pause();
                    }
                }

                this.repaint();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                if (undefined !== tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    if (value >= threshold && !ledBlinking) {
                        ledBlinking = true;
                        blink(ledBlinking);
                    } else if (value < threshold) {
                        ledBlinking = false;
                        blink(ledBlinking);
                    }

                    if (value > maxMeasuredValue) {
                        maxMeasuredValue = value;
                    }
                    if (value < minMeasuredValue) {
                        minMeasuredValue = value;
                    }

                    gauge.repaint();
                };

                tween.start();
            }
        };

        this.resetMinMeasuredValue = function() {
            minMeasuredValue = value;
            this.repaint();
         };

        this.resetMaxMeasuredValue = function() {
            maxMeasuredValue = value;
            this.repaint();
        };

        this.setMinMeasuredValueVisible = function(visible) {
            minMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setMaxMeasuredValueVisible = function(visible) {
            maxMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setThresholdVisible = function(visible) {
            thresholdVisible = visible;
            this.repaint();
        };

        this.setLcdDecimals = function(decimals) {
            lcdDecimals = decimals;
            this.repaint();
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({background: true});
            backgroundColor = newBackgroundColor;
            init({background: true});
            this.repaint();
        };

        this.setValueColor = function(newValueColor) {
            valueColor = newValueColor;
            //init();
            this.repaint();
        };

        this.setLedColor = function(newLedColor) {
            resetBuffers({led: true});
            ledColor = newLedColor;
            init({led: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            resetBuffers({background: true});
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.setMaxMeasuredValue = function(value) {
            var targetValue = (value < minValue ? minValue : (value > maxValue ? maxValue : value));
            maxMeasuredValue = targetValue;
            this.repaint();
        };

        this.setMinMeasuredValue = function(value) {
            var targetValue = (value < minValue ? minValue : (value > maxValue ? maxValue : value));
            minMeasuredValue = targetValue;
            this.repaint();
        };

        this.setTitleString = function(title){
            titleString = title;
            init({background: true});
            this.repaint();
        };

        this.setUnitString = function(unit){
            unitString = unit;
            init({background: true});
            this.repaint();
        };

        this.setMinValue = function(value){
            minValue = value;
            init({background: true,
                foreground: true,
                pointer: true});
            this.repaint();
        };

        this.getMinValue = function(){
            return minValue;
        };

        this.setMaxValue = function(value){
            maxValue = value;
            init({background: true,
                foreground: true,
                pointer: true});
            this.repaint();
        };

        this.getMaxValue = function(){
            return maxValue;
        };

        this.setThreshold = function(threshVal) {
            var targetValue = (threshVal < minValue ? minValue : (threshVal > maxValue ? maxValue : threshVal));
            threshold = targetValue;
            init({background: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      foreground: true});
            }

            var valuePos;

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            mainCtx.drawImage(backgroundBuffer, 0, 0);

            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(value, vertical);
            }

            // Draw led
            if (ledVisible) {
                if (value < threshold) {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, ledPosX, ledPosY);
            }

            // Draw min measured value indicator
            if (minMeasuredValueVisible) {
                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (minMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth * 0.05) / 2 + 1);
                } else {
                    valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * minMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.05) / 2 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(minMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (maxMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth) * 0.05 / 2 + 1);
                } else {
                    valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * maxMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.05) / 2 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(maxMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            mainCtx.save();
            drawValue(mainCtx, imageWidth, imageHeight);
            mainCtx.restore();

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var linearBargraph = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 140 : parameters.width);
        var height = (undefined === parameters.height ? 320 : parameters.height);
        var minValue = (undefined === parameters.minValue ? 0 : parameters.minValue);
        var maxValue = (undefined === parameters.maxValue ? (minValue + 100) : parameters.maxValue);
        var section = (undefined === parameters.section ? null : parameters.section);
        var useSectionColors = (undefined === parameters.useSectionColors ? false : parameters.useSectionColors);
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var valueColor = (undefined === parameters.valueColor ? steelseries.ColorDef.RED : parameters.valueColor);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);
        var ledVisible = (undefined === parameters.ledVisible ? true : parameters.ledVisible);
        var thresholdVisible = (undefined === parameters.thresholdVisible ? true : parameters.thresholdVisible);
        var minMeasuredValueVisible = (undefined === parameters.minMeasuredValueVisible ? false : parameters.minMeasuredValueVisible);
        var maxMeasuredValueVisible = (undefined === parameters.maxMeasuredValueVisible ? false : parameters.maxMeasuredValueVisible);
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);
        var valueGradient  = (undefined === parameters.valueGradient  ? null : parameters.valueGradient );
        var useValueGradient = (undefined === parameters.useValueGradient ? false : parameters.useValueGradient);

        // Create audio tag for alarm sound
        if (playAlarm && alarmSound !== false) {
            var audioElement = doc.createElement('audio');
            audioElement.setAttribute('src', alarmSound);
            audioElement.setAttribute('preload', 'auto');
        }

        var self = this;
        var value = minValue;

        // Properties
        var minMeasuredValue = maxValue;
        var maxMeasuredValue = minValue;

        var tween;
        var ledBlinking = false;
        var isSectionsVisible = false;
        var isGradientVisible = false;
        var sectionPixels = [];
        var ledTimerId = 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;

        var imageWidth = mainCtx.canvas.width;
        var imageHeight = mainCtx.canvas.height;

        var vertical = width <= height;

        // Constants
        var ledPosX;
        var ledPosY;
        var stdFont;
        var lcdFont;

        if (vertical) {
            ledPosX = 0.453271 * imageWidth;
            ledPosY = (18 / imageHeight) * imageHeight;
            stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageWidth / 10) + 'px ' + lcdFontName;
        } else {
            ledPosX = (imageWidth - 18 - 16) / imageWidth * imageWidth;
            ledPosY = 0.453271 * imageHeight;
            stdFont = Math.floor(imageHeight / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageHeight / 10) + 'px ' + lcdFontName;
        }

        var initialized = false;

        // Tickmark specific private variables
        var niceMinValue = minValue;
        var niceMaxValue = maxValue;
        var niceRange = maxValue - minValue;
        var range = niceMaxValue - niceMinValue;
        var minorTickSpacing = 0;
        var majorTickSpacing = 0;
        var maxNoOfMinorTicks = 10;
        var maxNoOfMajorTicks = 10;

        // Method to calculate nice values for min, max and range for the tickmarks
        var calculate = function calculate() {
            if (niceScale) {
                niceRange = calcNiceNumber(maxValue - minValue, false);
                majorTickSpacing = calcNiceNumber(niceRange / (maxNoOfMajorTicks - 1), true);
                niceMinValue = Math.floor(minValue / majorTickSpacing) * majorTickSpacing;
                niceMaxValue = Math.ceil(maxValue / majorTickSpacing) * majorTickSpacing;
                minorTickSpacing = calcNiceNumber(majorTickSpacing / (maxNoOfMinorTicks - 1), true);
                minValue = niceMinValue;
                maxValue = niceMaxValue;
                range = maxValue - minValue;
            } else {
                niceRange = (maxValue - minValue);
                niceMinValue = minValue;
                niceMaxValue = maxValue;
                range = niceRange;
                minorTickSpacing = 1;
                majorTickSpacing = 10;
            }
        };

        // **************   Buffer creation  ********************
        // Buffer for the frame
        var frameBuffer = createBuffer(width, height);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for the background
        var backgroundBuffer = createBuffer(width, height);
        var backgroundContext = backgroundBuffer.getContext('2d');

        var lcdBuffer;

        // Buffer for active bargraph led
        var activeLedBuffer = doc.createElement('canvas');
        if (vertical) {
            activeLedBuffer.width = imageWidth * 0.121428;
            activeLedBuffer.height = imageHeight * 0.012135;
        } else {
            activeLedBuffer.width = imageWidth * 0.012135;
            activeLedBuffer.height = imageHeight * 0.121428;
        }
        var activeLedContext = activeLedBuffer.getContext('2d');

        // Buffer for active bargraph led
        var inActiveLedBuffer = doc.createElement('canvas');
        if (vertical) {
            inActiveLedBuffer.width = imageWidth * 0.121428;
            inActiveLedBuffer.height = imageHeight * 0.012135;
        } else {
            inActiveLedBuffer.width = imageWidth * 0.012135;
            inActiveLedBuffer.height = imageHeight * 0.121428;
        }
        var inActiveLedContext = inActiveLedBuffer.getContext('2d');

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(Math.ceil(width * 0.093457), Math.ceil(width * 0.093457));
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(Math.ceil(width * 0.093457), Math.ceil(width * 0.093457));
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.028037), Math.ceil(width * 0.028037));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.028037), Math.ceil(width * 0.028037));
        var maxMeasuredValueCtx = maxMeasuredValueBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(width, height);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawLcdText = function(value, vertical) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.textBaseline = 'middle';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                if (vertical) {
                    mainCtx.shadowOffsetX = imageWidth * 0.007;
                    mainCtx.shadowOffsetY = imageWidth * 0.007;
                    mainCtx.shadowBlur = imageWidth * 0.009;
                } else {
                    mainCtx.shadowOffsetX = imageHeight * 0.007;
                    mainCtx.shadowOffsetY = imageHeight * 0.007;
                    mainCtx.shadowBlur = imageHeight * 0.009;
                }
            }

            var lcdTextX;
            var lcdTextY;
            var lcdTextWidth;

            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }

            if (vertical) {
                lcdTextX = (imageWidth - (imageWidth * 0.571428)) / 2 + 1 + imageWidth * 0.571428 - 2;
                lcdTextY = imageHeight * 0.88 + 1 + (imageHeight * 0.055 - 2) / 2;
                lcdTextWidth = imageWidth * 0.7 - 2;
            } else {
                lcdTextX = (imageWidth * 0.695) + imageWidth * 0.18 - 2;
                lcdTextY = (imageHeight * 0.22) + 1 + (imageHeight * 0.15 - 2) / 2;
                lcdTextWidth = imageHeight * 0.22 - 2;
            }

            mainCtx.fillText(value.toFixed(lcdDecimals), lcdTextX, lcdTextY, lcdTextWidth);

            mainCtx.restore();
        };

        var createThresholdImage = function(vertical) {
            var thresholdBuffer = doc.createElement('canvas');
            if (vertical) {
                thresholdBuffer.width = Math.ceil(imageWidth * 0.046728);
            } else {
                thresholdBuffer.width = Math.ceil(imageHeight * 0.046728);
            }
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0, '#520000');
            gradThreshold.addColorStop(0.3, '#fc1d00');
            gradThreshold.addColorStop(0.59, '#fc1d00');
            gradThreshold.addColorStop(1, '#520000');
            thresholdCtx.fillStyle = gradThreshold;

            if (vertical) {
                thresholdCtx.beginPath();
                thresholdCtx.moveTo(0.1, thresholdBuffer.height * 0.5);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, thresholdBuffer.height * 0.9);
                thresholdCtx.closePath();
            } else {
                thresholdCtx.beginPath();
                thresholdCtx.moveTo(0.1, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.9, 0.1);
                thresholdCtx.lineTo(thresholdBuffer.width * 0.5, thresholdBuffer.height * 0.9);
                thresholdCtx.closePath();
            }

            thresholdCtx.fill();
            thresholdCtx.strokeStyle = '#FFFFFF';
            thresholdCtx.stroke();

            thresholdCtx.restore();

            return thresholdBuffer;
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat, vertical) {
            backgroundColor.labelColor.setAlpha(1);
            ctx.save();
            ctx.textBaseline = 'middle';
            var TEXT_WIDTH = imageWidth * 0.1;
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;
            var scaleBoundsX;
            var scaleBoundsY;
            var scaleBoundsW;
            var scaleBoundsH;
            var tickSpaceScaling = 1;

            var minorTickStart;
            var minorTickStop;
            var mediumTickStart;
            var mediumTickStop;
            var majorTickStart;
            var majorTickStop;
            if (vertical) {
                minorTickStart = (0.34 * imageWidth);
                minorTickStop = (0.36 * imageWidth);
                mediumTickStart = (0.33 * imageWidth);
                mediumTickStop = (0.36 * imageWidth);
                majorTickStart = (0.32 * imageWidth);
                majorTickStop = (0.36 * imageWidth);
                ctx.textAlign = 'right';
                scaleBoundsX = 0;
                scaleBoundsY = imageHeight * 0.128640;
                scaleBoundsW = 0;
                scaleBoundsH = (imageHeight * 0.856796 - imageHeight * 0.128640);
                tickSpaceScaling = scaleBoundsH / (maxValue - minValue);
            } else {
                minorTickStart = (0.65 * imageHeight);
                minorTickStop = (0.63 * imageHeight);
                mediumTickStart = (0.66 * imageHeight);
                mediumTickStop = (0.63 * imageHeight);
                majorTickStart = (0.67 * imageHeight);
                majorTickStop = (0.63 * imageHeight);
                ctx.textAlign = 'center';
                scaleBoundsX = imageWidth * 0.142857;
                scaleBoundsY = 0;
                scaleBoundsW = (imageWidth * 0.871012 - imageWidth * 0.142857);
                scaleBoundsH = 0;
                tickSpaceScaling = scaleBoundsW / (maxValue - minValue);
            }

            for (var labelCounter = minValue, tickCounter = 0; labelCounter <= maxValue; labelCounter += minorTickSpacing, tickCounter += minorTickSpacing) {

                // Calculate the bounds of the scaling
                if (vertical) {
                    currentPos = scaleBoundsY + scaleBoundsH - tickCounter * tickSpaceScaling;
                } else {
                    currentPos = scaleBoundsX + tickCounter * tickSpaceScaling;
                }

                majorTickCounter++;

                // Draw tickmark every major tickmark spacing
                if (majorTickCounter === maxNoOfMinorTicks) {

                    // Draw the major tickmarks
                    ctx.lineWidth = 1.5;
                    drawLinearTicks(ctx, majorTickStart, majorTickStop, currentPos, vertical);

                    // Draw the standard tickmark labels
                    if (vertical) {
                    // Vertical orientation
                    switch(labelNumberFormat.format) {

                        case 'fractional':
                            ctx.fillText((valueCounter.toFixed(2)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;

                        case 'scientific':
                            ctx.fillText((valueCounter.toPrecision(2)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;

                        case 'standard':
                        default:
                            ctx.fillText((valueCounter.toFixed(0)), imageWidth * 0.28, currentPos, TEXT_WIDTH);
                            break;
                    }
                } else {
                        // Horizontal orientation
                        switch(labelNumberFormat.format) {

                            case 'fractional':
                                ctx.fillText((valueCounter.toFixed(2)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;

                            case 'scientific':
                                ctx.fillText((valueCounter.toPrecision(2)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;

                            case 'standard':
                            default:
                                ctx.fillText((valueCounter.toFixed(0)), currentPos, (imageHeight * 0.73), TEXT_WIDTH);
                                break;
                        }
                    }

                    valueCounter += majorTickSpacing;
                    majorTickCounter = 0;
                    continue;
                }

                // Draw tickmark every minor tickmark spacing
                if (0 === maxNoOfMinorTicks % 2 && majorTickCounter === (maxNoOfMinorTicks / 2)) {
                    ctx.lineWidth = 1;
                    drawLinearTicks(ctx, mediumTickStart, mediumTickStop, currentPos, vertical);
                } else {
                    ctx.lineWidth = 0.5;
                    drawLinearTicks(ctx, minorTickStart, minorTickStop, currentPos, vertical);
                }
            }

            ctx.restore();
        };

        var drawLinearTicks = function(ctx, tickStart, tickStop, currentPos, vertical) {
            if (vertical) {
                // Vertical orientation
                ctx.beginPath();
                ctx.moveTo(tickStart, currentPos);
                ctx.lineTo(tickStop, currentPos);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Horizontal orientation
                ctx.beginPath();
                ctx.moveTo(currentPos, tickStart);
                ctx.lineTo(currentPos, tickStop);
                ctx.closePath();
                ctx.stroke();
            }
        };

        // **************   Initialization  ********************
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawLed = (undefined === parameters.led ? false : parameters.led);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);
            var drawBargraphLed = (undefined === parameters.bargraphled ? false : parameters.bargraphled);

            initialized = true;

            // Calculate the current min and max values and the range
            calculate();

            // Create frame in frame buffer (backgroundBuffer)
            if (drawFrame && frameVisible) {
                drawLinearFrameImage(frameContext, frameDesign, imageWidth, imageHeight, vertical);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                drawLinearBackgroundImage(backgroundContext, backgroundColor, imageWidth, imageHeight);
            }

            if (drawLed) {
                if (vertical) {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(width * 0.093457), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(width * 0.093457), 0, ledColor), 0, 0);
                } else {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(height * 0.093457), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(height * 0.093457), 0, ledColor), 0, 0);
                }
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                if (vertical) {
                    minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(width * 0.05), steelseries.ColorDef.BLUE.dark.getRgbaColor(), false, vertical), 0, 0);
                } else {
                    minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(height * 0.05), steelseries.ColorDef.BLUE.dark.getRgbaColor(), false, vertical), 0, 0);
                }
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                if (vertical) {
                    maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(width * 0.05), steelseries.ColorDef.RED.medium.getRgbaColor(), false, vertical), 0, 0);
                } else {
                    maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(height * 0.05), steelseries.ColorDef.RED.medium.getRgbaColor(), false, vertical), 0, 0);
                }
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground && backgroundVisible) {
                var valuePos;
                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat, vertical);

                // Draw threshold image to background context
                if (thresholdVisible) {
                    backgroundContext.save();
                    if (vertical) {
                        // Vertical orientation
                        valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (threshold / (maxValue - minValue));
                        backgroundContext.translate(imageWidth * 0.435714 - Math.ceil(imageWidth * 0.046728) - 2, valuePos - Math.ceil(imageWidth * 0.046728) / 2);
                    } else {
                        // Horizontal orientation
                        valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * threshold / (maxValue - minValue);
                        backgroundContext.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.046728) / 2 + valuePos, imageHeight * 0.571428 + 2);
                    }
                    backgroundContext.drawImage(createThresholdImage(vertical), 0, 0);
                    backgroundContext.restore();
                }

                // Create title in background buffer (backgroundBuffer)
                if (vertical) {
                    drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, null, lcdVisible);
                } else {
                    drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, null, lcdVisible);
                }
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                if (vertical) {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.571428, imageHeight * 0.055, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, ((imageWidth - (imageWidth * 0.571428)) / 2), imageHeight * 0.88);
                } else {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.18, imageHeight * 0.15, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, imageWidth * 0.695, imageHeight * 0.22);
                }
            }

            // Draw leds of bargraph
            if (drawBargraphLed) {
                drawInActiveLed(inActiveLedContext);
                drawActiveLed(activeLedContext, valueColor);
            }

            // Convert Section values into pixels
            isSectionsVisible = false;
            if (null !== section && 0 < section.length) {
                isSectionsVisible = true;
                var sectionIndex = section.length;
                var top, bottom, fullSize, ledWidth2;

                if (vertical) {
                    // Vertical orientation
                    top =  imageHeight * 0.128640; // position of max value
                    bottom = imageHeight * 0.856796; // position of min value
                    fullSize = bottom - top;
                    ledWidth2 = 0;
                } else {
                    // Horizontal orientation
                    top = imageWidth * 0.856796; // position of max value
                    bottom = imageWidth * 0.128640;
                    fullSize = top - bottom;
                    ledWidth2 = imageWidth * 0.012135 / 2;
                }
                sectionPixels = [];
                do {
                    sectionIndex--;
                    sectionPixels.push({start: (((section[sectionIndex].start + Math.abs(minValue)) / (maxValue - minValue)) * fullSize - ledWidth2),
                                         stop: (((section[sectionIndex].stop + Math.abs(minValue)) / (maxValue - minValue)) * fullSize - ledWidth2),
                                        color: customColorDef(section[sectionIndex].color)});
                } while (0 < sectionIndex);
            }

            // Use a gradient for the valueColor?
            isGradientVisible = false;
            if (useValueGradient && valueGradient !== null) {
                // force section colors off!
                isSectionsVisible = false;
                isGradientVisible = true;
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground && foregroundVisible) {
                drawLinearForegroundImage(foregroundContext, imageWidth, imageHeight, vertical, false);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetLed = (undefined === buffers.led ? false : buffers.led);
            var resetBargraphLed = (undefined === buffers.bargraphled ? false : buffers.bargraphled);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = width;
                frameBuffer.height = height;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = width;
                backgroundBuffer.height = height;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if (resetBargraphLed) {
                if (vertical) {
                    activeLedBuffer.width = width * 0.121428;
                    activeLedBuffer.height = height * 0.012135;
                } else {
                    activeLedBuffer.width = width * 0.012135;
                    activeLedBuffer.height = height * 0.121428;
                }
                activeLedContext = activeLedBuffer.getContext('2d');

                // Buffer for active bargraph led
                if (vertical) {
                    inActiveLedBuffer.width = width * 0.121428;
                    inActiveLedBuffer.height = height * 0.012135;
                } else {
                    inActiveLedBuffer.width = width * 0.012135;
                    inActiveLedBuffer.height = height * 0.121428;
                }
                inActiveLedContext = inActiveLedBuffer.getContext('2d');
            }

            if (resetLed) {
                ledBufferOn.width = Math.ceil(width * 0.093457);
                ledBufferOn.height = Math.ceil(height * 0.093457);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(width * 0.093457);
                ledBufferOff.height = Math.ceil(height * 0.093457);
                ledContextOff = ledBufferOff.getContext('2d');

                // Buffer for current led painting code
                ledBuffer = ledBufferOff;
            }

            if (resetForeground) {
                foregroundBuffer.width = width;
                foregroundBuffer.height = height;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(toggleAndRepaintLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };

        var toggleAndRepaintLed = function() {
            if (ledVisible) {
                if (ledBuffer === ledBufferOn) {
                    ledBuffer = ledBufferOff;
                } else {
                    ledBuffer = ledBufferOn;
                }

                self.repaint();
            }
        };

        var drawValue = function(ctx, imageWidth, imageHeight) {
            var vertical = imageWidth < imageHeight;
            var top; // position of max value
            var bottom; // position of min value
            var labelColor = backgroundColor.labelColor;
            var fullSize;
            var valueSize;
            var valueTop;
            var valueBackgroundStartX;
            var valueBackgroundStartY;
            var valueBackgroundStopX;
            var valueBackgroundStopY;
            var valueBorderStartX;
            var valueBorderStartY;
            var valueBorderStopX;
            var valueBorderStopY;

            // Orientation dependend definitions
            if (vertical) {
                // Vertical orientation
                top =  imageHeight * 0.128640; // position of max value
                bottom = imageHeight * 0.856796; // position of min value
                fullSize = bottom - top;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = top + fullSize - valueSize;
                valueBackgroundStartX = 0;
                valueBackgroundStartY = top;
                valueBackgroundStopX = 0;
                valueBackgroundStopY = top + fullSize * 1.014;
            } else {
                // Horizontal orientation
                top = imageWidth * 0.856796; // position of max value
                bottom = imageWidth * 0.128640;
                fullSize = top - bottom;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = bottom;
                valueBackgroundStartX = imageWidth * 0.13;
                valueBackgroundStartY = imageHeight * 0.435714;
                valueBackgroundStopX = valueBackgroundStartX + fullSize * 1.035;
                valueBackgroundStopY = valueBackgroundStartY;
            }

            var darker = (backgroundColor === steelseries.BackgroundColor.CARBON ||
                          backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET ||
                          backgroundColor === steelseries.BackgroundColor.STAINLESS ||
                          backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS ||
                          backgroundColor === steelseries.BackgroundColor.TURNED) ? 0.3 : 0;

            var valueBackgroundTrackGradient = ctx.createLinearGradient(valueBackgroundStartX, valueBackgroundStartY, valueBackgroundStopX, valueBackgroundStopY);
            labelColor.setAlpha(0.047058 + darker);
            valueBackgroundTrackGradient.addColorStop(0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.145098 + darker);
            valueBackgroundTrackGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.149019 + darker);
            valueBackgroundTrackGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.047058 + darker);
            valueBackgroundTrackGradient.addColorStop(1, labelColor.getRgbaColor());
            ctx.fillStyle = valueBackgroundTrackGradient;

            if (vertical) {
                ctx.fillRect(imageWidth * 0.435714, top, imageWidth * 0.15, fullSize * 1.014);
            } else {
                ctx.fillRect(valueBackgroundStartX, valueBackgroundStartY, fullSize * 1.035, imageHeight * 0.152857);
            }

            if (vertical) {
                // Vertical orientation
                valueBorderStartX = 0;
                valueBorderStartY = top;
                valueBorderStopX = 0;
                valueBorderStopY = top + fullSize * 1.014;
            } else {
                // Horizontal orientation                ;
                valueBorderStartX = valueBackgroundStartX;
                valueBorderStartY = 0;
                valueBorderStopX = valueBackgroundStopX;
                valueBorderStopY = 0;
            }

            var valueBorderGradient = ctx.createLinearGradient(valueBorderStartX, valueBorderStartY, valueBorderStopX, valueBorderStopY);
            labelColor.setAlpha(0.298039 + darker);
            valueBorderGradient.addColorStop(0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.686274 + darker);
            valueBorderGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.698039 + darker);
            valueBorderGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.4 + darker);
            valueBorderGradient.addColorStop(1, labelColor.getRgbaColor());
            ctx.fillStyle = valueBorderGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.435714, top, imageWidth * 0.007142, fullSize * 1.014);
                ctx.fillRect(imageWidth * 0.571428, top, imageWidth * 0.007142, fullSize * 1.014);
            } else {
                ctx.fillRect(imageWidth * 0.13, imageHeight * 0.435714, fullSize * 1.035, imageHeight * 0.007142);
                ctx.fillRect(imageWidth * 0.13, imageHeight * 0.571428, fullSize * 1.035, imageHeight * 0.007142);
            }

            // Prepare led specific variables
            var ledX;
            var ledY;
            var ledW;
            var ledH;
            var ledCenterX;
            var ledCenterY;
            var activeLeds;
            var inactiveLeds;
            if (vertical) {
                // VERTICAL
                ledX = imageWidth * 0.45;
                ledY = imageHeight * 0.851941;
                ledW = imageWidth * 0.121428;
                ledH = imageHeight * 0.012135;
                ledCenterX = (ledX + ledW) / 2;
                ledCenterY = (ledY + ledH) / 2;
            } else {
                // HORIZONTAL
                ledX = imageWidth * 0.142857;
                ledY = imageHeight * 0.45;
                ledW = imageWidth * 0.012135;
                ledH = imageHeight * 0.121428;
                ledCenterX = (ledX + ledW) / 2;
                ledCenterY = (ledY + ledH) / 2;
            }

            var translateX, translateY;
            var activeLedColor;
            var lastActiveLedColor = valueColor;
            // Draw the value
            if (vertical) {
                // Draw the inactive leds
                inactiveLeds = ((maxValue + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                for (translateY = 0 ; translateY <= inactiveLeds ; translateY += ledH + 1) {
                    ctx.translate(0, -translateY);
                    ctx.drawImage(inActiveLedBuffer, ledX, ledY);
                    ctx.translate(0, translateY);
                }
                // Draw the active leds in dependence on the current value
                activeLeds = ((value + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                for (translateY = 0 ; translateY <= activeLeds ; translateY += ledH + 1) {
                    //check for LED color
                    activeLedColor = valueColor;
                    // Use a gradient for value colors?
                    if (isGradientVisible) {
                        // Convert pixel back to value
                        var currentValue = minValue + (translateY / fullSize) * (maxValue - minValue);
                        var gradRange = valueGradient.getEnd() - valueGradient.getStart();
                        var fraction = currentValue / gradRange;
                        fraction = Math.max(Math.min(fraction, 1),0);
                        activeLedColor = customColorDef(valueGradient.getColorAt(fraction).getRgbaColor());
                    } else if (isSectionsVisible) {
                        for (var i =0; i < sectionPixels.length; i++) {
                            if (translateY >= sectionPixels[i].start && translateY < sectionPixels[i].stop) {
                                activeLedColor = sectionPixels[i].color;
                                break;
                            }
                        }
                    }
                    // Has LED color changed? If so redraw the buffer
                    if (lastActiveLedColor.medium.getHexColor() != activeLedColor.medium.getHexColor()) {
                        drawActiveLed(activeLedContext, activeLedColor);
                        lastActiveLedColor = activeLedColor;
                    }
                    // Draw LED
                    ctx.translate(0, -translateY);
                    ctx.drawImage(activeLedBuffer, ledX, ledY);
                    ctx.translate(0, translateY);
                }
            } else {
                // Draw the inactive leds
                inactiveLeds = ((maxValue + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                for (translateX = -(ledW / 2) ; translateX <= inactiveLeds ; translateX += ledW + 1) {
                    ctx.translate(translateX, 0);
                    ctx.drawImage(inActiveLedBuffer, ledX, ledY);
                    ctx.translate(-translateX, 0);
                }
                // Draw the active leds in dependence on the current value
                activeLeds = ((value + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                for (translateX = -(ledW / 2) ; translateX <= activeLeds ; translateX += ledW + 1) {
                    //check for LED color
                    activeLedColor = valueColor;
                    if (isGradientVisible) {
                        // Convert pixel back to value
                        var currentValue = minValue + (translateX / fullSize) * (maxValue - minValue);
                        var gradRange = valueGradient.getEnd() - valueGradient.getStart();
                        var fraction = currentValue / gradRange;
                        fraction = Math.max(Math.min(fraction, 1),0);
                        activeLedColor = customColorDef(valueGradient.getColorAt(fraction).getRgbaColor());
                    } else if (isSectionsVisible) {
                        for (var i =0; i < sectionPixels.length; i++) {
                            if (translateX >= sectionPixels[i].start && translateX < sectionPixels[i].stop) {
                                activeLedColor = sectionPixels[i].color;
                                break;
                            }
                        }
                    }
                    // Has LED color changed? If so redraw the buffer
                    if (lastActiveLedColor.medium.getHexColor() != activeLedColor.medium.getHexColor()) {
                        drawActiveLed(activeLedContext, activeLedColor);
                        lastActiveLedColor = activeLedColor;
                    }
                    ctx.translate(translateX, 0);
                    ctx.drawImage(activeLedBuffer, ledX, ledY);
                    ctx.translate(-translateX, 0);
                }
            }
        };

        var drawInActiveLed = function(ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.closePath();
            var ledCenterX = (ctx.canvas.width / 2);
            var ledCenterY = (ctx.canvas.height / 2);
            var ledGradient = mainCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, ctx.canvas.width / 2);
            ledGradient.addColorStop(0, '#3c3c3c');
            ledGradient.addColorStop(1, '#323232');
            ctx.fillStyle = ledGradient;
            ctx.fill();
            ctx.restore();
        };

        var drawActiveLed = function(ctx, color) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.closePath();
            var ledCenterX = (ctx.canvas.width / 2);
            var ledCenterY = (ctx.canvas.height / 2);
            var outerRadius;
            if (vertical) {
                outerRadius = ctx.canvas.width / 2;
            } else {
                outerRadius = ctx.canvas.height / 2;
            }
            var ledGradient = mainCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, outerRadius);
            ledGradient.addColorStop(0, color.light.getRgbaColor());
            ledGradient.addColorStop(1, color.dark.getRgbaColor());
            ctx.fillStyle = ledGradient;
            ctx.fill();
            ctx.restore();
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                value = targetValue;

                if (value > maxMeasuredValue) {
                    maxMeasuredValue = value;
                }
                if (value < minMeasuredValue) {
                    minMeasuredValue = value;
                }

                if (value >= threshold && !ledBlinking) {
                    ledBlinking = true;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.play();
                    }
                } else if (value < threshold) {
                    ledBlinking = false;
                    blink(ledBlinking);
                    if (playAlarm) {
                        audioElement.pause();
                    }
                }

                this.repaint();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (value !== targetValue) {
                if (undefined !== tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    if (value >= threshold && !ledBlinking) {
                        ledBlinking = true;
                        blink(ledBlinking);
                    } else if (value < threshold) {
                        ledBlinking = false;
                        blink(ledBlinking);
                    }

                    if (value > maxMeasuredValue) {
                        maxMeasuredValue = value;
                    }
                    if (value < minMeasuredValue) {
                        minMeasuredValue = value;
                    }

                    gauge.repaint();
                };

                tween.start();
            }
        };

        this.resetMinMeasuredValue = function() {
                minMeasuredValue = value;
                this.repaint();
        };

        this.resetMaxMeasuredValue = function() {
                maxMeasuredValue = value;
                this.repaint();
        };

        this.setMinMeasuredValueVisible = function(visible) {
            minMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setMaxMeasuredValueVisible = function(visible) {
            maxMeasuredValueVisible = visible;
            this.repaint();
        };

        this.setThresholdVisible = function(visible) {
            thresholdVisible = visible;
            this.repaint();
        };

        this.setLcdDecimals = function(decimals) {
            lcdDecimals = decimals;
            this.repaint();
         };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({background: true});
            backgroundColor = newBackgroundColor;
            init({background: true});
            this.repaint();
        };

        this.setValueColor = function(newValueColor) {
            resetBuffers({bargraphled: true});
            valueColor = newValueColor;
            init({bargraphled: true});
            this.repaint();
         };

        this.setLedColor = function(newLedColor) {
            resetBuffers({led: true});
            ledColor = newLedColor;
            init({led: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.setSection = function(areaSec) {
                section = areaSec;
                init();
                this.repaint();
        };

        this.setSectionActive = function(value) {
            useSectionColors = value;
            init();
            this.repaint();
        };

        this.setGradient = function(grad) {
            valueGradient = grad;
            init();
            this.repaint();
        };

        this.setGradientActive = function(value) {
            useGradient = value;
            init();
            this.repaint();
        };

        this.setMaxMeasuredValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (maxMeasuredValue !== targetValue) {
                maxMeasuredValue = targetValue;
                this.repaint();
            }
        };

        this.setMinMeasuredValue = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (minMeasuredValue !== targetValue) {
                minMeasuredValue = targetValue;
                this.repaint();
            }
        };

        this.setTitleString = function(title){
            titleString = title;
            init({background: true});
            this.repaint();
        };

        this.setUnitString = function(unit){
            unitString = unit;
            init({background: true});
            this.repaint();
        };

        this.setMinValue = function(value){
            minValue = value;
            init({background: true,
                foreground: true,
                pointer: true});
            this.repaint();
        };

        this.getMinValue = function(){
            return minValue;
        };

        this.setMaxValue = function(value){
            if (maxValue !== value) {
                maxValue = value;
                init({background: true,
                    foreground: true,
                    pointer: true});
                this.repaint();
            }
        };

        this.getMaxValue = function(){
            return maxValue;
        };

        this.setThreshold = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : (newValue > maxValue ? maxValue : newValue));
            if (threshold !== targetValue) {
                threshold = targetValue;
                init({background: true});
                this.repaint();
            }
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointer: true,
                      foreground: true,
                      bargraphled: true});
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            if (backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(value, vertical);
            }

            // Draw led
            if (ledVisible) {
                if (value < threshold) {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, ledPosX, ledPosY);
            }
            var valuePos;
            // Draw min measured value indicator
            if (minMeasuredValueVisible) {

                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (minMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth * 0.05) / 2 + 1);
                } else {
                    valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * minMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.05) / 2 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(minMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.856796 - (imageHeight * 0.728155) * (maxMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth) * 0.05 / 2 + 1);
                } else {
                    valuePos = ((imageWidth * 0.856796) - (imageWidth * 0.128640)) * maxMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.142857 - Math.ceil(imageHeight * 0.05) / 2 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(maxMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            mainCtx.save();
            drawValue(mainCtx, imageWidth, imageHeight);
            mainCtx.restore();

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var displaySingle = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 128 : parameters.width);
        var height = (undefined === parameters.height ? 48 : parameters.height);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var unitString = (undefined === parameters.unitString ? '' : parameters.unitString);
        var unitStringVisible = (undefined === parameters.unitStringVisible ? false : parameters.unitStringVisible);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var valuesNumeric = (undefined === parameters.valuesNumeric ? true : parameters.valuesNumeric);
        var value = (undefined === parameters.value ? 0 : parameters.value);
        var autoScroll = (undefined === parameters.autoScroll ? false : parameters.autoScroll);
        var section = (undefined === parameters.section ? null : parameters.section);

        var scrolling = false;
        var scrollX = 0;
        var scrollTimer;

        var self = this;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;

        var imageWidth = width;
        var imageHeight = height;
        var textWidth = 0;

        var fontHeight = Math.floor(imageHeight / 1.5);
        var stdFont = fontHeight + 'px sans-serif';
        var lcdFont = fontHeight + 'px ' + lcdFontName;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for the lcd
        var lcdBuffer;
        var sectionBuffer = [];
        var sectionForegroundColor = [];

        // **************   Image creation  ********************
        var drawLcdText = function(value, color) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
//            mainCtx.textBaseline = 'top';
            mainCtx.strokeStyle = color;
            mainCtx.fillStyle = color;

            mainCtx.beginPath();
            mainCtx.rect(2, 0, imageWidth - 4, imageHeight);
            mainCtx.closePath();
            mainCtx.clip();
/*
            if ((lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN)
                 && section === null) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageHeight * 0.05;
                mainCtx.shadowOffsetY = imageHeight * 0.05;
                mainCtx.shadowBlur = imageHeight * 0.06;
            }
 */
            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }

            if (valuesNumeric) {
                // Numeric value
                var unitWidth = 0;
                textWidth = 0;
                if (unitStringVisible) {
                    mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                    unitWidth = mainCtx.measureText(unitString).width;
                }
                if (digitalFont) {
                    mainCtx.font = lcdFont;
                } else {
                    mainCtx.font = stdFont;
                }
                var lcdText = value.toFixed(lcdDecimals);
                textWidth = mainCtx.measureText(lcdText).width;
                mainCtx.fillText(lcdText, imageWidth - unitWidth - 4 - scrollX, imageHeight * 0.5 + fontHeight * 0.38);

                if (unitStringVisible) {
                    mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                    mainCtx.fillText(unitString, imageWidth - 2 - scrollX, imageHeight * 0.5 + fontHeight * 0.38);
                }
            } else {
                // Text value
                textWidth = mainCtx.measureText(value).width;
                if (autoScroll && textWidth > imageWidth -4) {
                    if (!scrolling) {
                        scrollX = imageWidth - textWidth - imageWidth * 0.2; // leave 20% blank leading space to give time to read start of message
                        scrolling = true;
                        clearTimeout(scrollTimer);  // kill any pending animate
                        scrollTimer = setTimeout(animate, 200);
                    }
                } else if (autoScroll && textWidth <= imageWidth -4) {
                    scrollX = 0;
                    scrolling = false;
                }
                mainCtx.fillText(value, imageWidth - 2 - scrollX, imageHeight * 0.5 + fontHeight * 0.38);
            }
            mainCtx.restore();
        };

        var createLcdSectionImage = function(width, height, color, lcdColor) {
            var lcdSectionBuffer = createBuffer(width, height);
            var lcdCtx = lcdSectionBuffer.getContext('2d');

            lcdCtx.save();
            var xB = 0;
            var yB = 0;
            var wB = width;
            var hB = height;
            var rB = Math.min(width, height) * 0.095;

            var lcdBackground = lcdCtx.createLinearGradient(0, yB, 0, yB + hB);

            lcdBackground.addColorStop(0, '#4c4c4c');
            lcdBackground.addColorStop(0.08, '#666666');
            lcdBackground.addColorStop(0.92, '#666666');
            lcdBackground.addColorStop(1, '#e6e6e6');
            lcdCtx.fillStyle = lcdBackground;

            roundedRectangle(lcdCtx, xB, yB, wB, hB, rB);

            lcdCtx.fill();
            lcdCtx.restore();

            lcdCtx.save();

            var rgb = getColorValues(color);
            var hsb = rgbToHsb(rgb[0], rgb[1], rgb[2]);

            var rgbStart = getColorValues(lcdColor.gradientStartColor);
            var hsbStart = rgbToHsb(rgbStart[0], rgbStart[1], rgbStart[2]);
            var rgbFraction1 = getColorValues(lcdColor.gradientFraction1Color);
            var hsbFraction1 = rgbToHsb(rgbFraction1[0], rgbFraction1[1], rgbFraction1[2]);
            var rgbFraction2 = getColorValues(lcdColor.gradientFraction2Color);
            var hsbFraction2 = rgbToHsb(rgbFraction2[0], rgbFraction2[1], rgbFraction2[2]);
            var rgbFraction3 = getColorValues(lcdColor.gradientFraction3Color);
            var hsbFraction3 = rgbToHsb(rgbFraction3[0], rgbFraction3[1], rgbFraction3[2]);
            var rgbStop = getColorValues(lcdColor.gradientStopColor);
            var hsbStop = rgbToHsb(rgbStop[0], rgbStop[1], rgbStop[2]);

            var startColor = hsb2Rgb(hsb[0], hsb[1], hsbStart[2] - 0.31);
            var fraction1Color = hsb2Rgb(hsb[0], hsb[1], hsbFraction1[2] - 0.31);
            var fraction2Color = hsb2Rgb(hsb[0], hsb[1], hsbFraction2[2] - 0.31);
            var fraction3Color = hsb2Rgb(hsb[0], hsb[1], hsbFraction3[2] - 0.31);
            var stopColor = hsb2Rgb(hsb[0], hsb[1], hsbStop[2] - 0.31);

            var xF = 1;
            var yF = 1;
            var wF = width - 2;
            var hF = height - 2;
            var rF = rB - 1;
            var lcdForeground = lcdCtx.createLinearGradient(0, yF, 0, yF + hF);
            lcdForeground.addColorStop(0, 'rgb(' + startColor[0] + ', ' + startColor[1] + ', ' + startColor[2] + ')');
            lcdForeground.addColorStop(0.03, 'rgb(' + fraction1Color[0] + ',' + fraction1Color[1] + ',' + fraction1Color[2] + ')');
            lcdForeground.addColorStop(0.49, 'rgb(' + fraction2Color[0] + ',' + fraction2Color[1] + ',' + fraction2Color[2] + ')');
            lcdForeground.addColorStop(0.5, 'rgb(' + fraction3Color[0] + ',' + fraction3Color[1] + ',' + fraction3Color[2] + ')');
            lcdForeground.addColorStop(1, 'rgb(' + stopColor[0] + ',' + stopColor[1] + ',' + stopColor[2] + ')');
            lcdCtx.fillStyle = lcdForeground;

            roundedRectangle(lcdCtx, xF, yF, wF, hF, rF);

            lcdCtx.fill();
            lcdCtx.restore();

            return lcdSectionBuffer;
        };

        var createSectionForegroundColor = function(sectionColor) {
            var rgbSection = getColorValues(sectionColor);
            var hsbSection = rgbToHsb(rgbSection[0], rgbSection[1], rgbSection[2]);
            var sectionForegroundRgb = hsb2Rgb(hsbSection[0], 0.57, 0.83);
            return 'rgb(' + sectionForegroundRgb[0] + ', ' + sectionForegroundRgb[1] + ', ' + sectionForegroundRgb[2] + ')';
        }

        var animate = function() {
            if (scrolling) {
                if (scrollX > imageWidth) {
                    scrollX = -textWidth;
                }
                scrollX += 2;
                scrollTimer = setTimeout(animate, 60);
            } else {
                scrollX = 0;
            }
            self.repaint();
        };

        // **************   Initialization  ********************
        var init = function() {
            initialized = true;

            // Create lcd background if selected in background buffer (backgroundBuffer)
            lcdBuffer = createLcdBackgroundImage(width, height, lcdColor);

            if (null !== section && 0 < section.length) {
                for (var sectionIndex = 0 ; sectionIndex < section.length ; sectionIndex++) {
                    sectionBuffer[sectionIndex] = createLcdSectionImage(width, height, section[sectionIndex].color, lcdColor);
                    sectionForegroundColor[sectionIndex] = createSectionForegroundColor(section[sectionIndex].color);
                }
            }

        };

        // **************   Public methods  ********************
        this.setValue = function(newValue) {
            if (value !== newValue) {
                value = newValue;
                this.repaint();
            }
        };

        this.setLcdColor = function(newLcdColor) {
                lcdColor = newLcdColor;
                init();
                this.repaint();
        };

        this.setSection = function(newSection){
                section = newSection;
                resetBuffers({foreground: true});
                init({background: true, foreground: true});
                this.repaint();
        };

        this.setScrolling = function(scroll) {
            if (scroll) {
                if (scrolling) {
                    return;
                } else {
                    scrolling = scroll;
                    animate();
                }
            } else { //disable scrolling
                scrolling = scroll;
            }

 /*
            if (scrolling) {
                return;
            }
            if (scroll) {
                oldValue = value;
                scrollTimer = setInterval(function(){ animate(); }, 60);
            } else {
                clearInterval(scrollTimer);
                value = oldValue;
                scrollX = 0;
                this.repaint();
            }

            scrolling = scroll;
*/
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            var lcdBackgroundBuffer = lcdBuffer;
            var lcdTextColor = lcdColor.textColor;
            // Draw sections
            if (null !== section && 0 < section.length) {
                for (var sectionIndex = 0 ; sectionIndex < section.length ; sectionIndex++) {
                    if (value >= section[sectionIndex].start && value <= section[sectionIndex].stop) {
                        lcdBackgroundBuffer = sectionBuffer[sectionIndex];
                        lcdTextColor = sectionForegroundColor[sectionIndex];
                        break;
                    }
                }
            }

            // Draw lcd background
            mainCtx.drawImage(lcdBackgroundBuffer, 0, 0);

            // Draw lcd text
            drawLcdText(value, lcdTextColor);
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var displayMulti = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 128 : parameters.width);
        var height = (undefined === parameters.height ? 64 : parameters.height);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdDecimals = (undefined === parameters.lcdDecimals ? 2 : parameters.lcdDecimals);
        var unitString = (undefined === parameters.unitString ? '' : parameters.unitString);
        var unitStringVisible = (undefined === parameters.unitStringVisible ? false : parameters.unitStringVisible);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var valuesNumeric = (undefined === parameters.valuesNumeric ? true : parameters.valuesNumeric);
        var value = (undefined === parameters.value ? 0 : parameters.value);

        var oldValue = 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;

        var imageWidth = width;
        var imageHeight = height;

        var stdFont = Math.floor(imageHeight / 1.875) + 'px sans-serif';
        var lcdFont = Math.floor(imageHeight / 1.875) + 'px ' + lcdFontName;
        var stdOldFont = Math.floor(imageHeight / 3.5) + 'px sans-serif';
        var lcdOldFont = Math.floor(imageHeight / 3.5) + 'px ' + lcdFontName;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for the lcd
        var lcdBuffer;

        // **************   Image creation  ********************
        var drawLcdText = function(value) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.textBaseline = 'middle';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;
            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageHeight * 0.05;
                mainCtx.shadowOffsetY = imageHeight * 0.05;
                mainCtx.shadowBlur = imageHeight * 0.06;
            }
            if (valuesNumeric) {
                // Numeric value
                mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                var unitWidth = 0;
                if (unitStringVisible) {
                    mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                    unitWidth = mainCtx.measureText(unitString).width;
                }
                if (digitalFont) {
                    mainCtx.font = lcdFont;
                } else {
                    mainCtx.font = stdFont;
                }
                var valueText = value.toFixed(lcdDecimals);
                mainCtx.fillText(valueText, imageWidth - unitWidth - 4, imageHeight * 0.38);

                if (unitStringVisible) {
                    mainCtx.font = Math.floor(imageHeight / 3) + 'px sans-serif';
                    mainCtx.fillText(unitString, imageWidth - 2, imageHeight * 0.46);
                }

                var oldValueText = oldValue.toFixed(lcdDecimals);
                if (digitalFont) {
                    mainCtx.font = lcdOldFont;
                } else {
                    mainCtx.font = stdOldFont;
                }
                mainCtx.textAlign = 'center';
                mainCtx.fillText(oldValueText, imageWidth / 2, imageHeight * 0.8);
            } else {
                // Text value
                mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                mainCtx.fillText(value, imageWidth - 2, imageHeight * 0.38);

                mainCtx.font = stdOldFont;
                mainCtx.textAlign = 'center';
                mainCtx.fillText(oldValue, imageWidth / 2, imageHeight * 0.8);
            }
            mainCtx.restore();
        };

        // **************   Initialization  ********************
        var init = function() {
            initialized = true;

            // Create lcd background if selected in background buffer (backgroundBuffer)
            lcdBuffer = createLcdBackgroundImage(width, height, lcdColor);
        };

        // **************   Public methods  ********************
        this.setValue = function(newValue) {
            if (value !== newValue || oldValue !== newValue) {
                oldValue = value;
                value = newValue;
                this.repaint();
            }
         };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init();
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw lcd background
            mainCtx.drawImage(lcdBuffer, 0, 0);

            // Draw lcd text
            drawLcdText(value);
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var level = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var decimalsVisible = (undefined === parameters.decimalsVisible ? false : parameters.decimalsVisible);
        var textOrientationFixed = (undefined === parameters.textOrientationFixed ? false : parameters.textOrientationFixed);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);

        var tween;

        var value = 0;
        var stepValue = 0;
        var visibleValue = 0;
        var angleStep = 2 * Math.PI / 360;
        var angle = this.value;
        var decimals = decimalsVisible ? 1 : 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for all static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var pointerBuffer = createBuffer(size, size);
        var pointerContext = pointerBuffer.getContext('2d');

        // Buffer for step pointer image painting code
        var stepPointerBuffer = createBuffer(size, size);
        var stepPointerContext = stepPointerBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawTickmarksImage = function(ctx) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);
            var stdFont;
            var smlFont;

            for (i = 0; 360 > i; i++) {
                ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(imageWidth * 0.38, 0);
                ctx.lineTo(imageWidth * 0.37, 0);
                ctx.closePath();
                ctx.stroke();

                if (0 === i % 5) {
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.38, 0);
                    ctx.lineTo(imageWidth * 0.36, 0);
                    ctx.closePath();
                    ctx.stroke();
                }

                if (0 === i % 45) {
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.38, 0);
                    ctx.lineTo(imageWidth * 0.34, 0);
                    ctx.closePath();
                    ctx.stroke();
                }

                // Draw the labels
                if (300 < imageWidth) {
                    stdFont = '14px sans-serif';
                    smlFont = '12px sans-serif';
                }
                if (300 >= imageWidth) {
                    stdFont = '12px sans-serif';
                    smlFont = '10px sans-serif';
                }
                if (200 >= imageWidth) {
                    stdFont = '10px sans-serif';
                    smlFont = '8px sans-serif';
                }
                if (100 >= imageWidth) {
                    stdFont = '8px sans-serif';
                    smlFont = '6px sans-serif';
                }
                ctx.save();
                switch (i) {
                    case 0:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) + Math.PI / 2);
                        ctx.font = stdFont;
                        ctx.fillText("0\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) + Math.PI / 2);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.41, 0);
                        ctx.rotate((i * Math.PI / 180) - Math.PI / 2);
                        ctx.font = smlFont;
                        ctx.fillText("0%", 0, 0, imageWidth);
                        break;
                    case 45:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) + 0.25 * Math.PI);
                        ctx.font = stdFont;
                        ctx.fillText("45\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) + 0.25 * Math.PI);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.31, imageWidth * 0.085);
                        ctx.rotate((i * Math.PI / 180) - 0.25 * Math.PI);
                        ctx.font = smlFont;
                        ctx.fillText("100%", 0, 0, imageWidth);
                        break;
                    case 90:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180));
                        ctx.font = stdFont;
                        ctx.fillText("90\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180));
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.21, 0);
                        ctx.rotate((i * Math.PI / 180));
                        ctx.font = smlFont;
                        ctx.fillText("\u221E", 0, 0, imageWidth);
                        break;
                    case 135:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) - 0.25 * Math.PI);
                        ctx.font = stdFont;
                        ctx.fillText("45\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) - 0.25 * Math.PI);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.31, -imageWidth * 0.085);
                        ctx.rotate((i * Math.PI / 180) + 0.25 * Math.PI);
                        ctx.font = smlFont;
                        ctx.fillText("100%", 0, 0, imageWidth);
                        break;
                    case 180:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) - Math.PI / 2);
                        ctx.font = stdFont;
                        ctx.fillText("0\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) - Math.PI / 2);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.41, 0);
                        ctx.rotate((i * Math.PI / 180) + Math.PI / 2);
                        ctx.font = smlFont;
                        ctx.fillText("0%", 0, 0, imageWidth);
                        ctx.translate(-imageWidth * 0.41, 0);
                        break;
                    case 225:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) - 0.75 * Math.PI);
                        ctx.font = stdFont;
                        ctx.fillText("45\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) - 0.75 * Math.PI);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.31, imageWidth * 0.085);
                        ctx.rotate((i * Math.PI / 180) + 0.75 * Math.PI);
                        ctx.font = smlFont;
                        ctx.fillText("100%", 0, 0, imageWidth);
                        break;
                    case 270:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) - Math.PI);
                        ctx.font = stdFont;
                        ctx.fillText("90\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) - Math.PI);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.21, 0);
                        ctx.rotate((i * Math.PI / 180) - Math.PI);
                        ctx.font = smlFont;
                        ctx.fillText("\u221E", 0, 0, imageWidth);
                        break;
                    case 315:
                        ctx.translate(imageWidth * 0.31, 0);
                        ctx.rotate((i * Math.PI / 180) - 1.25 * Math.PI);
                        ctx.font = stdFont;
                        ctx.fillText("45\u00B0", 0, 0, imageWidth);
                        ctx.rotate(-(i * Math.PI / 180) - 1.25 * Math.PI);
                        ctx.translate(-imageWidth * 0.31, 0);

                        ctx.translate(imageWidth * 0.31, -imageWidth * 0.085);
                        ctx.rotate((i * Math.PI / 180) + 1.25 * Math.PI);
                        ctx.font = smlFont;
                        ctx.fillText("100%", 0, 0, imageWidth);
                        break;
                }
                ctx.restore();

                ctx.rotate(angleStep);
            }
            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawMarkerImage = function(ctx) {
            ctx.save();

            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            // FRAMELEFT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.200934, imageHeight * 0.434579);
            ctx.lineTo(imageWidth * 0.163551, imageHeight * 0.434579);
            ctx.lineTo(imageWidth * 0.163551, imageHeight * 0.560747);
            ctx.lineTo(imageWidth * 0.200934, imageHeight * 0.560747);
            ctx.lineWidth = 1;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.stroke();

            // TRIANGLELEFT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.163551, imageHeight * 0.471962);
            ctx.lineTo(imageWidth * 0.205607, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.163551, imageHeight * 0.523364);
            ctx.lineTo(imageWidth * 0.163551, imageHeight * 0.471962);
            ctx.closePath();
            ctx.fill();

            // FRAMERIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.799065, imageHeight * 0.434579);
            ctx.lineTo(imageWidth * 0.836448, imageHeight * 0.434579);
            ctx.lineTo(imageWidth * 0.836448, imageHeight * 0.560747);
            ctx.lineTo(imageWidth * 0.799065, imageHeight * 0.560747);
            ctx.lineWidth = 1;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.stroke();

            // TRIANGLERIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.836448, imageHeight * 0.471962);
            ctx.lineTo(imageWidth * 0.794392, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.836448, imageHeight * 0.523364);
            ctx.lineTo(imageWidth * 0.836448, imageHeight * 0.471962);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        var drawPointerImage = function(ctx) {
            ctx.save();

            // POINTER_LEVEL
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.523364, imageHeight * 0.350467);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.130841);
            ctx.lineTo(imageWidth * 0.476635, imageHeight * 0.350467);
            ctx.bezierCurveTo(imageWidth * 0.476635, imageHeight * 0.350467, imageWidth * 0.490654, imageHeight * 0.345794, imageWidth * 0.5, imageHeight * 0.345794);
            ctx.bezierCurveTo(imageWidth * 0.509345, imageHeight * 0.345794, imageWidth * 0.523364, imageHeight * 0.350467, imageWidth * 0.523364, imageHeight * 0.350467);
            ctx.closePath();
            var POINTER_LEVEL_GRADIENT = ctx.createLinearGradient(0, 0.154205 * imageHeight, 0, 0.350466 * imageHeight);
            var tmpDarkColor = pointerColor.dark;
            var tmpLightColor = pointerColor.light;
            tmpDarkColor.setAlpha(0.70588);
            tmpLightColor.setAlpha(0.70588);
            POINTER_LEVEL_GRADIENT.addColorStop(0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(1, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_GRADIENT;
            var strokeColor_POINTER_LEVEL = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL;
            ctx.fill();
            ctx.stroke();

            tmpDarkColor.setAlpha(1);
            tmpLightColor.setAlpha(1);

            ctx.restore();
        };

        var drawStepPointerImage = function(ctx) {
            ctx.save();

            var tmpDarkColor = pointerColor.dark;
            var tmpLightColor = pointerColor.light;
            tmpDarkColor.setAlpha(0.70588);
            tmpLightColor.setAlpha(0.70588);

            // POINTER_LEVEL_LEFT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.285046, imageHeight * 0.514018);
            ctx.lineTo(imageWidth * 0.210280, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.285046, imageHeight * 0.481308);
            ctx.bezierCurveTo(imageWidth * 0.285046, imageHeight * 0.481308, imageWidth * 0.280373, imageHeight * 0.490654, imageWidth * 0.280373, imageHeight * 0.495327);
            ctx.bezierCurveTo(imageWidth * 0.280373, imageHeight * 0.504672, imageWidth * 0.285046, imageHeight * 0.514018, imageWidth * 0.285046, imageHeight * 0.514018);
            ctx.closePath();
            var POINTER_LEVEL_LEFT_GRADIENT = ctx.createLinearGradient(0.224299 * imageWidth, 0, 0.289719 * imageWidth, 0);
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(1, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_LEFT_GRADIENT;
            var strokeColor_POINTER_LEVEL_LEFT = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL_LEFT;
            ctx.fill();
            ctx.stroke();

            // POINTER_LEVEL_RIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.714953, imageHeight * 0.514018);
            ctx.lineTo(imageWidth * 0.789719, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.714953, imageHeight * 0.481308);
            ctx.bezierCurveTo(imageWidth * 0.714953, imageHeight * 0.481308, imageWidth * 0.719626, imageHeight * 0.490654, imageWidth * 0.719626, imageHeight * 0.495327);
            ctx.bezierCurveTo(imageWidth * 0.719626, imageHeight * 0.504672, imageWidth * 0.714953, imageHeight * 0.514018, imageWidth * 0.714953, imageHeight * 0.514018);
            ctx.closePath();
            var POINTER_LEVEL_RIGHT_GRADIENT = ctx.createLinearGradient(0.775700 * imageWidth, 0, 0.71028 * imageWidth, 0);
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(1, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_RIGHT_GRADIENT;
            var strokeColor_POINTER_LEVEL_RIGHT = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL_RIGHT;
            ctx.fill();
            ctx.stroke();

            tmpDarkColor.setAlpha(1);
            tmpLightColor.setAlpha(1);

            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function() {
            initialized = true;

            if (frameVisible) {
                drawRadialFrameImage(backgroundContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (backgroundVisible) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);
                drawTickmarksImage(backgroundContext);
            }

            drawMarkerImage(pointerContext);

            drawPointerImage(pointerContext);

            drawStepPointerImage(stepPointerContext);

            if (foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false);
            }
        };

        var resetBuffers = function() {
            backgroundBuffer.width = size;
            backgroundBuffer.height = size;
            backgroundContext = backgroundBuffer.getContext('2d');

            // Buffer for pointer image painting code
            pointerBuffer.width = size;
            pointerBuffer.height = size;
            pointerContext = pointerBuffer.getContext('2d');

            // Buffer for step pointer image painting code
            stepPointerBuffer.width = size;
            stepPointerBuffer.height = size;
            stepPointerContext = stepPointerBuffer.getContext('2d');

            // Buffer for static foreground painting code
            foregroundBuffer.width = size;
            foregroundBuffer.height = size;
            foregroundContext = foregroundBuffer.getContext('2d');
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            var targetValue;

            targetValue = 0 > newValue ? (360 + newValue) : newValue;
            targetValue = 359.9 < newValue ? (newValue - 360) : newValue;

            if (value !== targetValue) {
                value = targetValue;
                stepValue = 2 * ((Math.abs(value) * 10) % 10);
                if (10 < stepValue) {
                    stepValue -= 20;
                }

                if (0===value) {
                    visibleValue = 90;
                }

                if (0 < value && 90 >= value) {
                    visibleValue = (90 - value);
                }

                if (90 < value && 180 >= value) {
                    visibleValue = (value - 90);
                }

                if (180 < value && 270 >= value) {
                    visibleValue = (270 - value);
                }

                if (270 < value && 360 >= value) {
                    visibleValue = (value - 270);
                }

                if (0 > value && value >= -90) {
                    visibleValue = (90 - Math.abs(value));
                }

                if (value < -90 && value >= -180) {
                    visibleValue = Math.abs(value) - 90;
                }

                if (value < -180 && value >= -270) {
                    visibleValue = 270 - Math.abs(value);
                }

                if (value < -270 && value >= -360) {
                    visibleValue = Math.abs(value) - 270;
                }

                this.repaint();
            }
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            if (360 - newValue + value < newValue - value) {
                newValue = 360 - newValue;
            }
            if (value !== newValue) {
                if (undefined !== tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                //tween = new Tween(new Object(),'',Tween.elasticEaseOut,this.value,targetValue, 1);
                tween = new Tween({}, '', Tween.regularEaseInOut, value, newValue, 1);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, this.value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;
                    stepValue = 2 * ((Math.abs(value) * 10) % 10);
                    if (10 < stepValue) {
                        stepValue -= 20;
                    }

                    if (0 === value) {
                        visibleValue = 90;
                    }

                    if (0 < value && 90 >= value) {
                        visibleValue = (90 - value);
                    }

                    if (90 < value && 180 >= value) {
                        visibleValue = (value - 90);
                    }

                    if (180 < value && 270 >= value) {
                        visibleValue = (270 - value);
                    }

                    if (270 < value && 360 >= value) {
                        visibleValue = (value - 270);
                    }

                    if (0 > value && value >= -90) {
                        visibleValue = (90 - Math.abs(value));
                    }

                    if (value < -90 && value >= -180) {
                        visibleValue = Math.abs(value) - 90;
                    }

                    if (value < -180 && value >= -270) {
                        visibleValue = 270 - Math.abs(value);
                    }

                    if (value < -270 && value >= -360) {
                        visibleValue = Math.abs(value) - 270;
                    }

                    gauge.repaint();
                };
                tween.start();
            }
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers();
            frameDesign = newFrameDesign;
            init();
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers();
            backgroundColor = newBackgroundColor;
            init();
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers();
            foregroundType = newForegroundType;
            init();
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers();
            pointerColor = newPointerColor;
            init();
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw buffered image to visible canvas
            if (frameVisible || backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            angle = Math.PI / 2 + value * angleStep - Math.PI / 2;

            mainCtx.save();
            // Define rotation center
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angle);

            // Draw pointer
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBuffer, 0, 0);

            mainCtx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            mainCtx.textAlign = 'center';
            mainCtx.textBaseline = 'middle';

            if (textOrientationFixed) {
                mainCtx.restore();
                if (decimalsVisible) {
                    mainCtx.font = imageWidth * 0.1 + 'px sans-serif';
                } else {
                    mainCtx.font = imageWidth * 0.15 + 'px sans-serif';
                }
                mainCtx.fillText(visibleValue.toFixed(decimals) + "\u00B0", centerX, centerY, imageWidth * 0.35);
            } else {
                if (decimalsVisible) {
                    mainCtx.font = imageWidth * 0.15 + 'px sans-serif';
                } else {
                    mainCtx.font = imageWidth * 0.2 + 'px sans-serif';
                }
                mainCtx.fillText(visibleValue.toFixed(decimals) + "\u00B0", centerX, centerY, imageWidth * 0.35);
                mainCtx.restore();
            }

            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angle + stepValue * Math.PI / 180);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(stepPointerBuffer, 0, 0);
            mainCtx.restore();

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }

            mainCtx.restore();
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var compass = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var pointerType = (undefined === parameters.pointerType ? steelseries.PointerType.TYPE2 : parameters.pointerType);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var pointSymbols = (undefined === parameters.pointSymbols ? ["N","NE","E","SE","S","SW","W","NW"] : parameters.pointSymbols);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);
        var degreeScale = (undefined === parameters.degreeScale ? false : parameters.degreeScale);
        var roseVisible = (undefined === parameters.roseVisible ? true : parameters.roseVisible);
        var tween;
        var value = 0;
        var angleStep = 2 * Math.PI / 360;
        var angle = this.value;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for all static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var pointerBuffer = createBuffer(size, size);
        var pointerContext = pointerBuffer.getContext('2d');

        // Buffer for pointer shadow
        var pointerShadowBuffer = createBuffer(size, size);
        var pointerShadowContext = pointerShadowBuffer.getContext('2d');

        // Buffer for pointer shadow rotation
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawTickmarksImage = function(ctx) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var stdFont, smlFont;

            ctx.save();
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);

            if (!degreeScale) {

                stdFont = 0.12 * imageWidth + 'px serif';
                smlFont = 0.06 * imageWidth + 'px serif';

                for (i = 0; 360 > i; i+= 2.5) {

                    if (0 === i % 5) {
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(imageWidth * 0.38, 0);
                        ctx.lineTo(imageWidth * 0.36, 0);
                        ctx.closePath();
                        ctx.stroke();
                    }

                    // Draw the labels
                    ctx.save();
                    switch (i) {
                        case 0:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[2], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 45:
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[3], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 90:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[4], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 135:
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[5], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 180:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[6], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 225:
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[7], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 270:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[0], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 315:
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[1], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                    }
                    ctx.restore();

                    if (roseVisible && (0 === i || 22.5 === i || 45 === i || 67.5 === i || 90 === i || 112.5 === i || 135 === i || 157.5 === i || 180 === i || 202.5 === i || 225 === i || 247.5 === i || 270 === i || 292.5 === i || 315 === i || 337.5 === i || 360 === i)) {
                        // ROSE_LINE
                        ctx.save();
                        ctx.beginPath();
                        // indent the 16 half quadrant lines a bit for visual effect
                        if (i%45) {
                             ctx.moveTo(imageWidth * 0.29, 0);
                        } else {
                            ctx.moveTo(imageWidth * 0.38, 0);
                        }
                        ctx.lineTo(imageWidth * 0.1, 0);
                        ctx.closePath();
                        ctx.restore();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
                        ctx.stroke();
                    }
                    ctx.rotate(angleStep * 2.5);
                }
            } else {
                stdFont = 0.08 * imageWidth + 'px serif';
                smlFont = imageWidth * 0.033 + 'px serif';

                ctx.rotate(angleStep * 10);

                for (i = 10; 360 >= i; i+= 10) {
                    // Draw the labels
                    ctx.save();
                    switch (i) {
                        case 360:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[2], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 90:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                             ctx.fillText(pointSymbols[4], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                       case 180:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[6], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 270:
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[0], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        default:
                            var val = (i+90) % 360;
                            ctx.translate(imageWidth * 0.37, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(("0".substring(val>=100) + val), 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.37, 0);
                    }
                    ctx.restore();
                    ctx.rotate(angleStep * 10);
                }

            }
            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawPointerImage = function(ctx, shadow) {
            ctx.save();

            if (shadow) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            }

            switch (pointerType.type) {
                case "type2":
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.532710, imageHeight * 0.453271);
                    ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.453271, imageWidth * 0.5, imageHeight * 0.149532, imageWidth * 0.5, imageHeight * 0.149532);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.149532, imageWidth * 0.467289, imageHeight * 0.453271, imageWidth * 0.467289, imageHeight * 0.453271);
                    ctx.bezierCurveTo(imageWidth * 0.453271, imageHeight * 0.462616, imageWidth * 0.443925, imageHeight * 0.481308, imageWidth * 0.443925, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.443925, imageHeight * 0.5, imageWidth * 0.556074, imageHeight * 0.5, imageWidth * 0.556074, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.556074, imageHeight * 0.481308, imageWidth * 0.546728, imageHeight * 0.462616, imageWidth * 0.532710, imageHeight * 0.453271);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER2_GRADIENT = ctx.createLinearGradient(0.471962 * imageWidth, 0, 0.528036 * imageWidth, 0);
                        NORTHPOINTER2_GRADIENT.addColorStop(0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(1, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER2_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();

                    // SOUTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.467289, imageHeight * 0.546728);
                    ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.546728, imageWidth * 0.5, imageHeight * 0.850467, imageWidth * 0.5, imageHeight * 0.850467);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.850467, imageWidth * 0.532710, imageHeight * 0.546728, imageWidth * 0.532710, imageHeight * 0.546728);
                    ctx.bezierCurveTo(imageWidth * 0.546728, imageHeight * 0.537383, imageWidth * 0.556074, imageHeight * 0.518691, imageWidth * 0.556074, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.556074, imageHeight * 0.5, imageWidth * 0.443925, imageHeight * 0.5, imageWidth * 0.443925, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.443925, imageHeight * 0.518691, imageWidth * 0.453271, imageHeight * 0.537383, imageWidth * 0.467289, imageHeight * 0.546728);
                    ctx.closePath();
                    if (!shadow) {
                        var SOUTHPOINTER2_GRADIENT = ctx.createLinearGradient(0.471962 * imageWidth, 0, 0.528036 * imageWidth, 0);
                        SOUTHPOINTER2_GRADIENT.addColorStop(0, '#e3e5e8');
                        SOUTHPOINTER2_GRADIENT.addColorStop(0.48, '#e3e5e8');
                        SOUTHPOINTER2_GRADIENT.addColorStop(0.48, '#abb1b8');
                        SOUTHPOINTER2_GRADIENT.addColorStop(1, '#abb1b8');
                        ctx.fillStyle = SOUTHPOINTER2_GRADIENT;
                        var strokeColor_SOUTHPOINTER2 = '#abb1b8';
                        ctx.strokeStyle = strokeColor_SOUTHPOINTER2;
                    }
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                    break;

                case "type3":
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.149532);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.149532, imageWidth * 0.443925, imageHeight * 0.490654, imageWidth * 0.443925, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.443925, imageHeight * 0.532710, imageWidth * 0.467289, imageHeight * 0.556074, imageWidth * 0.5, imageHeight * 0.556074);
                    ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.556074, imageWidth * 0.556074, imageHeight * 0.532710, imageWidth * 0.556074, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.556074, imageHeight * 0.490654, imageWidth * 0.5, imageHeight * 0.149532, imageWidth * 0.5, imageHeight * 0.149532);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER3_GRADIENT = ctx.createLinearGradient(0.471962 * imageWidth, 0, 0.528036 * imageWidth, 0);
                        NORTHPOINTER3_GRADIENT.addColorStop(0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(1, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER3_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                    break;

                case "type1:":
                default:
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.495327);
                    ctx.lineTo(imageWidth * 0.528037, imageHeight * 0.495327);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.149532);
                    ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.495327);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.495327);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER1_GRADIENT = ctx.createLinearGradient(0.471962 * imageWidth, 0, 0.528036 * imageWidth, 0);
                        NORTHPOINTER1_GRADIENT.addColorStop(0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(1, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER1_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();

                    // SOUTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.504672);
                    ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.504672);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.850467);
                    ctx.lineTo(imageWidth * 0.528037, imageHeight * 0.504672);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.504672);
                    ctx.closePath();
                    if (!shadow) {
                        var SOUTHPOINTER1_GRADIENT = ctx.createLinearGradient(0.471962 * imageWidth, 0, 0.528036 * imageWidth, 0);
                        SOUTHPOINTER1_GRADIENT.addColorStop(0, '#e3e5e8');
                        SOUTHPOINTER1_GRADIENT.addColorStop(0.48, '#e3e5e8');
                        SOUTHPOINTER1_GRADIENT.addColorStop(0.480099, '#abb1b8');
                        SOUTHPOINTER1_GRADIENT.addColorStop(1, '#abb1b8');
                        ctx.fillStyle = SOUTHPOINTER1_GRADIENT;
                        var strokeColor_SOUTHPOINTER = '#abb1b8';
                        ctx.strokeStyle = strokeColor_SOUTHPOINTER;
                    }
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                break;
            }
            if (shadow) {
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function() {
            initialized = true;

            if (frameVisible) {
                drawRadialFrameImage(backgroundContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (backgroundVisible) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);

                if (roseVisible) {
                    drawRoseImage(backgroundContext, centerX, centerY, imageWidth, imageHeight, backgroundColor);
                }

                drawTickmarksImage(backgroundContext);
            }

            drawPointerImage(pointerContext, false);
            drawPointerImage(pointerShadowContext, true);

            if (foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle);
            }
        };

        var resetBuffers = function() {
            // Buffer for all static background painting code
            backgroundBuffer.width = size;
            backgroundBuffer.height = size;
            backgroundContext = backgroundBuffer.getContext('2d');

            // Buffer for pointer image painting code
            pointerBuffer.width = size;
            pointerBuffer.height = size;
            pointerContext = pointerBuffer.getContext('2d');

            pointerShadowBuffer.width = size;
            pointerShadowBuffer.height = size;
            pointerShadowContext = pointerShadowBuffer.getContext('2d');

            pointerRotBuffer.width = size;
            pointerRotBuffer.height = size;
            pointerRotContext = pointerRotBuffer.getContext('2d');

            // Buffer for static foreground painting code
            foregroundBuffer.width = size;
            foregroundBuffer.height = size;
            foregroundContext = foregroundBuffer.getContext('2d');
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            newValue = newValue % 360;
            if (value !== newValue) {
                value = newValue;
                this.repaint();
            }
        };

        this.getValue = function() {

            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = newValue % 360;
            var gauge = this;
            var diff;
            if (value !== targetValue) {
                if (undefined !==  tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }

                diff = getShortestAngle(value, targetValue);
                tween = new Tween({}, '', Tween.elasticEaseOut, value, value + diff, 2);
                tween.onMotionChanged = function(event) {
                    value = event.target._pos % 360;
                    gauge.repaint();
                };
                tween.start();
            }
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers();
            frameDesign = newFrameDesign;
            init();
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers();
            backgroundColor = newBackgroundColor;
            init();
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
                resetBuffers();
                foregroundType = newForegroundType;
                init();
                this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers();
            pointerColor = newPointerColor;
            init();
            this.repaint();
        };

        this.setPointerType = function(newPointerType) {
            resetBuffers();
            pointerType = newPointerType;
            init();
            this.repaint();
        };

        this.setPointSymbols = function(newPointSymbols) {
            resetBuffers();
            pointSymbols = newPointSymbols;
            init();
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            if (frameVisible || backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            // Define rotation center
            angle = Math.PI / 2 + value * angleStep - Math.PI / 2;

            // have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angle);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointerShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angle);

            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBuffer, 0, 0);
            mainCtx.restore();

            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }

            mainCtx.restore();
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var windDirection = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var pointerTypeLatest = (undefined === parameters.pointerTypeLatest ? steelseries.PointerType.TYPE1 : parameters.pointerTypeLatest);
        var pointerTypeAverage = (undefined === parameters.pointerTypeAverage ? steelseries.PointerType.TYPE8 : parameters.pointerTypeAverage);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var pointerColorAverage = (undefined === parameters.pointerColorAverage ? steelseries.ColorDef.BLUE : parameters.pointerColorAverage);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var pointSymbols = (undefined === parameters.pointSymbols ? ["N","NE","E","SE","S","SW","W","NW"] : parameters.pointSymbols);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);
        var degreeScale = (undefined === parameters.degreeScale ? true : parameters.degreeScale);
        var roseVisible = (undefined === parameters.roseVisible ? false : parameters.roseVisible);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.STANDARD : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var section = (undefined === parameters.section ? null : parameters.section);
        var area = (undefined === parameters.area ? null : parameters.area);
        var lcdTitleStrings = (undefined === parameters.lcdTitleStrings ? ["Latest","Average"] : parameters.lcdTitleStrings);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);

        var tweenLatest;
        var tweenAverage;
        var valueLatest = 0;
        var valueAverage = 0;
        var angleStep = 2 * Math.PI / 360;
        var angleLatest = this.valueLatest;
        var angleAverage = this.valueAverage;
        var rotationOffset = -Math.PI / 2;
        var angleRange = Math.PI * 2;
        var range = 360;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var lcdFontHeight = Math.floor(imageWidth / 10);
        var stdFont = lcdFontHeight + 'px sans-serif';
        var lcdFont = lcdFontHeight + 'px ' + lcdFontName;
        var lcdWidth = imageWidth * 0.3;
        var lcdHeight = imageHeight * 0.12;
        var lcdPosX = (imageWidth - lcdWidth) / 2;
        var lcdPosY1 = imageHeight * 0.32;
        var lcdPosY2 = imageHeight * 0.565;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for all static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for LCD displays
        var lcdBuffer;

        // Buffer for latest pointer images painting code
        var pointerBufferLatest = createBuffer(size, size);
        var pointerContextLatest = pointerBufferLatest.getContext('2d');

        // Buffer for latest pointer shadow
        var pointerShadowBufferLatest = createBuffer(size, size);
        var pointerShadowContextLatest = pointerShadowBufferLatest.getContext('2d');

        // Buffer for average pointer image
        var pointerBufferAverage = createBuffer(size, size);
        var pointerContextAverage = pointerBufferAverage.getContext('2d');

        // Buffer for pointer shadow
        var pointerShadowBufferAverage = createBuffer(size, size);
        var pointerShadowContextAverage = pointerShadowBufferAverage.getContext('2d');

        // Buffer for pointer shadow rotation
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawLcdText = function(value, bLatest) {
            mainCtx.save();
            mainCtx.textAlign = 'center';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            //convert value from -180,180 range into 0-360 range
            if (value < 0){ value += 360; }
            value = "00" + Math.round(value);
            value = value.substring(value.length,value.length-3);

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageWidth * 0.007;
                mainCtx.shadowOffsetY = imageWidth * 0.007;
                mainCtx.shadowBlur = imageWidth * 0.007;
            }
            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            if (bLatest) {
                mainCtx.fillText(value + "\u00B0", imageWidth / 2 + lcdWidth * 0.05, lcdPosY1 + lcdHeight * 0.5 + lcdFontHeight * 0.38, lcdWidth * 0.9);
            } else {
                mainCtx.fillText(value + "\u00B0", imageWidth / 2 + lcdWidth * 0.05, lcdPosY2 + lcdHeight * 0.5 + lcdFontHeight * 0.38, lcdWidth * 0.9);
            }

            mainCtx.restore();
        };

        var drawAreaSectionImage = function(ctx, start, stop, color, filled) {

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = imageWidth * 0.035;
            var startAngle = (angleRange / range * start);
            var stopAngle = startAngle + (stop - start) / (range / angleRange);
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            ctx.beginPath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, imageWidth * 0.365 - ctx.lineWidth / 2, startAngle, stopAngle, false);
            } else {
                ctx.arc(0, 0, imageWidth * 0.365, startAngle, stopAngle, false);
            }
//            ctx.closePath();
            if (filled) {
                ctx.moveTo(0, 0);
                ctx.fill();
            } else {
                ctx.stroke();
            }

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawTickmarksImage = function(ctx) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var OUTER_POINT = imageWidth * 0.38;
            var MAJOR_INNER_POINT = imageWidth * 0.35;
            var MED_INNER_POINT = imageWidth * 0.355;
            var MINOR_INNER_POINT = imageWidth * 0.36;
            var TEXT_WIDTH = imageWidth * 0.1;
            var TEXT_TRANSLATE_X = imageWidth * 0.31;
            var CARDINAL_TRANSLATE_X = imageWidth * 0.36;

            var stdFont, smlFont;

            ctx.save();
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);

            if (!degreeScale) {

                stdFont = 0.12 * imageWidth + 'px serif';
                smlFont = 0.06 * imageWidth + 'px serif';

                //var angleStep = 2 * Math.PI / 360;
                ctx.lineWidth = 1;
                ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();

                for (i = 0; 360 > i; i+= 2.5) {

                    if (0 === i % 5) {
                        ctx.beginPath();
                        ctx.moveTo(imageWidth * 0.38, 0);
                        ctx.lineTo(imageWidth * 0.36, 0);
                        ctx.closePath();
                        ctx.stroke();
                    }

                    // Draw the labels
                    ctx.save();
                    switch (i) {
                        case 0: //E
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[2], 0, 0);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 45: //SE
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[3], 0, 0);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 90: //S
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[4], 0, 0);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 135: //SW
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[5], 0, 0);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 180: //W
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[6], 0, 0);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 225: //NW
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[7], 0, 0);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 270: //N
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[0], 0, 0);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 315: //NE
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[1], 0, 0);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                    }
                    ctx.restore();

                    if (roseVisible && (0 === i || 22.5 === i || 45 === i || 67.5 === i || 90 === i || 112.5 === i || 135 === i || 157.5 === i || 180 === i || 202.5 === i || 225 === i || 247.5 === i || 270 === i || 292.5 === i || 315 === i || 337.5 === i || 360 === i)) {
                        // ROSE_LINE
                        ctx.save();
                        ctx.beginPath();
                        // indent the 16 half quadrant lines a bit for visual effect
                        if (i%45) {
                             ctx.moveTo(imageWidth * 0.29, 0);
                        } else {
                            ctx.moveTo(imageWidth * 0.38, 0);
                        }
                        ctx.lineTo(imageWidth * 0.1, 0);
                        ctx.closePath();
                        ctx.restore();
                        ctx.stroke();
                    }
                    ctx.rotate(angleStep * 2.5);
                }
            } else {
                stdFont = Math.floor(0.1 * imageWidth) + 'px serif bold';
                smlFont = Math.floor(imageWidth * 0.04) + 'px sans-serif';

                ctx.rotate(angleStep * 5);

                for (i = 5; 360 >= i; i+= 5) {
                    // Draw the labels
                    ctx.save();
                    switch (i) {
                        case 360:
                            ctx.translate(CARDINAL_TRANSLATE_X, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[2], 0, 0, TEXT_WIDTH);
                            ctx.translate(-CARDINAL_TRANSLATE_X, 0);
                            break;
                        case 90:
                            ctx.translate(CARDINAL_TRANSLATE_X, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[4], 0, 0, TEXT_WIDTH);
                            ctx.translate(-CARDINAL_TRANSLATE_X, 0);
                            break;
                       case 180:
                            ctx.translate(CARDINAL_TRANSLATE_X, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[6], 0, 0, TEXT_WIDTH);
                            ctx.translate(-CARDINAL_TRANSLATE_X, 0);
                            break;
                        case 270:
                            ctx.translate(CARDINAL_TRANSLATE_X, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[0], 0, 0, TEXT_WIDTH);
                            ctx.translate(-CARDINAL_TRANSLATE_X, 0);
                            break;
                        case 5:   case 85:  case 95:  case 175:
                        case 185: case 265: case 275: case 355:
                            //leave room for ordinal labels
                            break;
                        default:
                            if ((i+90) % 20) {
                                ctx.lineWidth = ((i+90)%5) ? 1.5 : 1;
                                ctx.beginPath();
                                ctx.moveTo(OUTER_POINT, 0);
                                var to = (i+90) % 10 ? MINOR_INNER_POINT : MAJOR_INNER_POINT;
                                ctx.lineTo(to, 0);
                                ctx.closePath();
                                ctx.stroke();
                            } else {
                                ctx.lineWidth = 1.5;
                                ctx.beginPath();
                                ctx.moveTo(OUTER_POINT, 0);
                                ctx.lineTo(MAJOR_INNER_POINT, 0);
                                ctx.closePath();
                                ctx.stroke();
                                var val = (i+90) % 360;
                                ctx.translate(TEXT_TRANSLATE_X, 0);
                                ctx.rotate(Math.PI/2);
                                ctx.font = smlFont;
                                ctx.fillText(("0".substring(val>=100) + val), 0, 0, TEXT_WIDTH);
                                ctx.translate(-TEXT_TRANSLATE_X, 0);
                            }
                    }
                    ctx.restore();
                    ctx.rotate(angleStep * 5);
                }

            }
            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawLcdTitles = function(ctx) {
            if (lcdTitleStrings.length > 0) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
                ctx.font = 0.040 * imageWidth + 'px sans-serif';
                ctx.fillText(lcdTitleStrings[0], imageWidth / 2, imageHeight * 0.29, imageWidth * 0.3);
                ctx.fillText(lcdTitleStrings[1], imageWidth / 2, imageHeight * 0.71, imageWidth * 0.3);
                if (titleString.length > 0) {
                    ctx.font = 0.0467 * imageWidth + 'px sans-serif';
                    ctx.fillText(titleString, imageWidth / 2, imageHeight * 0.5, imageWidth * 0.3);
                }
            }
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background

        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawPointer = (undefined === parameters.pointer ? false : parameters.pointer);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            if (drawFrame && frameVisible) {
                drawRadialFrameImage(backgroundContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (drawBackground && backgroundVisible) {
                // Create background in background buffer (backgroundBuffer)
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);

                // Create section in background buffer (backgroundBuffer)
                if (null !== section && 0 < section.length) {
                    var sectionIndex = section.length;
                    do {
                        sectionIndex--;
                        drawAreaSectionImage(backgroundContext, section[sectionIndex].start, section[sectionIndex].stop, section[sectionIndex].color, false);
                    }
                    while (0 < sectionIndex);
                }

                // Create area in background buffer (backgroundBuffer)
                if (null !== area && 0 < area.length) {
                    var areaIndex = area.length;
                    do {
                        areaIndex--;
                        drawAreaSectionImage(backgroundContext, area[areaIndex].start, area[areaIndex].stop, area[areaIndex].color, true);
                    }
                    while (0 < areaIndex);
                }


                drawTickmarksImage(backgroundContext);
            }

            if (drawBackground && roseVisible) {
                drawRoseImage(backgroundContext, centerX, centerY, imageWidth, imageHeight, backgroundColor);
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                lcdBuffer = createLcdBackgroundImage(lcdWidth, lcdHeight, lcdColor);
                backgroundContext.drawImage(lcdBuffer, lcdPosX, lcdPosY1);
                backgroundContext.drawImage(lcdBuffer, lcdPosX, lcdPosY2);
                // Create title in background buffer (backgroundBuffer)
                drawLcdTitles(backgroundContext);
            }

            if (drawPointer) {
                drawPointerImage(pointerContextAverage, imageWidth, pointerTypeAverage, pointerColorAverage, backgroundColor.labelColor);
                drawPointerImage(pointerShadowContextAverage, imageWidth, pointerTypeAverage, pointerColor, backgroundColor.labelColor, true);
                drawPointerImage(pointerContextLatest, imageWidth, pointerTypeLatest, pointerColor, backgroundColor.labelColor);
                drawPointerImage(pointerShadowContextLatest, imageWidth, pointerTypeLatest, pointerColor, backgroundColor.labelColor, true);
            }

            if (drawForeground && foregroundVisible) {
                var knobVisible = (pointerTypeLatest.type === 'type15' || pointerTypeLatest.type === 'type16' ? false : true);
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, knobVisible, knobType, knobStyle);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetPointer = (undefined === buffers.pointer ? false : buffers.pointer);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            // Buffer for all static background painting code
            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }
            // Buffers for pointer image painting code
            if (resetPointer) {
                pointerBufferLatest.width = size;
                pointerBufferLatest.height = size;
                pointerContextLatest = pointerBufferLatest.getContext('2d');

                pointerShadowBufferLatest.width = size;
                pointerShadowBufferLatest.height = size;
                pointerShadowContextLatest = pointerShadowBufferLatest.getContext('2d');

                pointerBufferAverage.width = size;
                pointerBufferAverage.height = size;
                pointerContextAverage = pointerBufferAverage.getContext('2d');

                pointerShadowBufferAverage.width = size;
                pointerShadowBufferAverage.height = size;
                pointerShadowContextAverage = pointerShadowBufferAverage.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
            }
            // Buffer for static foreground painting code
            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        //************************************ Public methods **************************************
        this.setValueLatest = function(newValue) {
            // Actually need to handle 0-360 rather than 0-359
            // 1-360 are used for directions
            // 0 is used as a special case to indicate 'calm'
            newValue = newValue === 360 ? 360 : newValue % 360;
            if (valueLatest !== newValue) {
                valueLatest = newValue;
                this.repaint();
            }
        };

        this.getValueLatest = function() {
            return valueLatest;
        };

        this.setValueAverage = function(newValue) {
            // Actually need to handle 0-360 rather than 0-359
            // 1-360 are used for directions
            // 0 is used as a special case to indicate 'calm'
            newValue = newValue % 360;
            if (valueAverage !== newValue) {
                valueAverage = newValue;
                this.repaint();
            }
        };

        this.getValueAverage = function() {
            return valueAverage;
        };

        this.setValueAnimatedLatest = function(newValue) {
            // Actually need to handle 0-360 rather than 0-359
            // 1-360 are used for directions
            // 0 is used as a special case to indicate 'calm'
            var targetValue = (newValue === 360 ? 360 : newValue % 360);
            if (valueLatest !== targetValue) {
                var gauge = this;

                if (undefined !== tweenLatest) {
                    if (tweenLatest.playing) {
                        tweenLatest.stop();
                    }
                }

                var diff = getShortestAngle(valueLatest, targetValue);
                tweenLatest = new Tween({}, '', Tween.regularEaseInOut, valueLatest, valueLatest + diff, 2.5);
                tweenLatest.onMotionChanged = function(event) {
                    valueLatest = event.target._pos % 360;
                    gauge.repaint();
                };
                // Use onMotionFinished to set end value in case targetValue = 360
                if (targetValue === 360) {
                    tweenLatest.onMotionFinished = function(event) {
                        valueLatest = targetValue;
                        gauge.repaint();
                    };
                }
                tweenLatest.start();
            }
        };

        this.setValueAnimatedAverage = function(newValue) {
            // Actually need to handle 0-360 rather than 0-359
            // 1-360 are used for directions
            // 0 is used as a special case to indicate 'calm'
            var targetValue = (newValue === 360 ? 360 : newValue % 360);
            if (valueAverage !== newValue) {
                var gauge = this;

                if (undefined !== tweenAverage) {
                    if (tweenAverage.playing) {
                        tweenAverage.stop();
                    }
                }

                var diff = getShortestAngle(valueAverage, targetValue);
                tweenAverage = new Tween({}, '', Tween.regularEaseInOut, valueAverage, valueAverage + diff, 2.5);
                tweenAverage.onMotionChanged = function(event) {
                    valueAverage = event.target._pos % 360;
                    gauge.repaint();
                };
                // Use onMotionFinished to set end value in case targetValue = 360
                if (targetValue === 360) {
                    tweenLatest.onMotionFinished = function(event) {
                        valueAverage = targetValue;
                        gauge.repaint();
                    };
                }
                tweenAverage.start();
            }
        };

        this.setArea = function(areaVal){
            area = areaVal;
            init({background: true});
            this.repaint();
        };

        this.setSection = function(areaSec){
            section = areaSec;
            init({background: true});
            this.repaint();
        };

        this.setFrameDesign = function(newFrameDesign) {
            frameDesign = newFrameDesign;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            backgroundColor = newBackgroundColor;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers({pointer: true});
            pointerColor = newPointerColor;
            init({pointer: true});
            this.repaint();
        };

        this.setPointerColorAverage = function(newPointerColor) {
            resetBuffers({pointer: true});
            pointerColorAverage = newPointerColor;
            init({pointer: true});
            this.repaint();
        };

        this.setPointerType = function(newPointerType) {
            resetBuffers({pointer: true});
            pointerTypeLatest = newPointerType;
            init({pointer: true});
            this.repaint();
        };

        this.setPointerTypeAverage = function(newPointerType) {
            resetBuffers({pointer: true});
            pointerTypeAverage = newPointerType;
            init({pointer: true});
            this.repaint();
        };

        this.setPointSymbols = function(newPointSymbols) {
            pointSymbols = newPointSymbols;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointer: true,
                      foreground: true});
           }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            if (frameVisible || backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(valueLatest, true);
                drawLcdText(valueAverage, false);
            }

            // Define rotation center
            angleAverage = Math.PI / 2 + valueAverage * angleStep - Math.PI / 2;

            // we have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angleAverage);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointerShadowBufferAverage, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            mainCtx.save();

            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angleAverage);

            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBufferAverage, 0, 0);
            mainCtx.restore();

            angleLatest = Math.PI / 2 + valueLatest * angleStep - Math.PI / 2;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angleLatest);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointerShadowBufferLatest, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(angleLatest);

            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBufferLatest, 0, 0);
            mainCtx.restore();

            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }

        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var horizon = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.WHITE : parameters.pointerColor);

        var tweenRoll;
        var tweenPitch;
        var roll = 0;
        var pitch = 0;
        var pitchPixel = (Math.PI * size) / 360;
        var pitchOffset = 0;
        var upsidedown = false;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for all static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var valueBuffer = createBuffer(size, size * Math.PI);
        var valueContext = valueBuffer.getContext('2d');

        // Buffer for indicator painting code
        var indicatorBuffer = createBuffer(size * 0.037383, size * 0.056074);
        var indicatorContext = indicatorBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawHorizonBackgroundImage = function(ctx) {
            ctx.save();

            var imgWidth = size;
            var imgHeight = size * Math.PI;
            var y;

            // HORIZON
            ctx.beginPath();
            ctx.rect(0, 0, imgWidth, imgHeight);
            ctx.closePath();
            var HORIZON_GRADIENT = ctx.createLinearGradient(0, 0, 0, imgHeight);
            HORIZON_GRADIENT.addColorStop(0, '#7fd5f0');
            HORIZON_GRADIENT.addColorStop(0.5, '#7fd5f0');
            HORIZON_GRADIENT.addColorStop(0.5, '#3c4439');
            HORIZON_GRADIENT.addColorStop(1, '#3c4439');
            ctx.fillStyle = HORIZON_GRADIENT;
            ctx.fill();

            ctx.lineWidth = 1;
            var stepSizeY = imgHeight / 360 * 5;
            var stepTen = false;
            var step = 10;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = imgWidth * 0.04;
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillStyle = '#37596e';
            for (y = imgHeight / 2 - stepSizeY; y > 0; y -= stepSizeY) {
                if (step <= 90) {
                    if (stepTen) {
                        ctx.fillText(step, (imgWidth - (imgWidth * 0.2)) / 2 - 8, y, imgWidth * 0.375);
                        ctx.fillText(step, imgWidth - (imgWidth - (imgWidth * 0.2)) / 2 + 8, y, imgWidth * 0.375);
                        ctx.beginPath();
                        ctx.moveTo((imgWidth - (imgWidth * 0.2)) / 2, y);
                        ctx.lineTo(imgWidth - (imgWidth - (imgWidth * 0.2)) / 2, y);
                        ctx.closePath();
                        step += 10;
                    } else {
                        ctx.beginPath();
                        ctx.moveTo((imgWidth - (imgWidth * 0.1)) / 2, y);
                        ctx.lineTo(imgWidth - (imgWidth - (imgWidth * 0.1)) / 2, y);
                        ctx.closePath();
                    }
                    ctx.stroke();
                }
                stepTen ^= true;
            }
            stepTen = false;
            step = 10;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, imgHeight / 2);
            ctx.lineTo(imgWidth, imgHeight / 2);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            for (y = imgHeight / 2 + stepSizeY; y <= imgHeight; y += stepSizeY) {
                if (step <= 90) {
                    if (stepTen) {
                        ctx.fillText(-step, (imgWidth - (imgWidth * 0.2)) / 2 - 8, y, imgWidth * 0.375);
                        ctx.fillText(-step, imgWidth - (imgWidth - (imgWidth * 0.2)) / 2 + 8, y, imgWidth * 0.375);
                        ctx.beginPath();
                        ctx.moveTo((imgWidth - (imgWidth * 0.2)) / 2, y);
                        ctx.lineTo(imgWidth - (imgWidth - (imgWidth * 0.2)) / 2, y);
                        ctx.closePath();
                        step += 10;
                    } else {
                        ctx.beginPath();
                        ctx.moveTo((imgWidth - (imgWidth * 0.1)) / 2, y);
                        ctx.lineTo(imgWidth - (imgWidth - (imgWidth * 0.1)) / 2, y);
                        ctx.closePath();
                    }
                    ctx.stroke();
                }
                stepTen ^= true;
            }

            ctx.restore();
        };

        var drawHorizonForegroundImage = function(ctx) {
            ctx.save();

            ctx.fillStyle = pointerColor.light.getRgbaColor();

            // CENTERINDICATOR
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.476635, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.476635, imageHeight * 0.514018, imageWidth * 0.485981, imageHeight * 0.523364, imageWidth * 0.5, imageHeight * 0.523364);
            ctx.bezierCurveTo(imageWidth * 0.514018, imageHeight * 0.523364, imageWidth * 0.523364, imageHeight * 0.514018, imageWidth * 0.523364, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.523364, imageHeight * 0.485981, imageWidth * 0.514018, imageHeight * 0.476635, imageWidth * 0.5, imageHeight * 0.476635);
            ctx.bezierCurveTo(imageWidth * 0.485981, imageHeight * 0.476635, imageWidth * 0.476635, imageHeight * 0.485981, imageWidth * 0.476635, imageHeight * 0.5);
            ctx.closePath();
            ctx.moveTo(imageWidth * 0.415887, imageHeight * 0.504672);
            ctx.lineTo(imageWidth * 0.415887, imageHeight * 0.495327);
            ctx.bezierCurveTo(imageWidth * 0.415887, imageHeight * 0.495327, imageWidth * 0.467289, imageHeight * 0.495327, imageWidth * 0.467289, imageHeight * 0.495327);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageHeight * 0.481308, imageWidth * 0.481308, imageHeight * 0.471962, imageWidth * 0.495327, imageHeight * 0.467289);
            ctx.bezierCurveTo(imageWidth * 0.495327, imageHeight * 0.467289, imageWidth * 0.495327, imageHeight * 0.415887, imageWidth * 0.495327, imageHeight * 0.415887);
            ctx.lineTo(imageWidth * 0.504672, imageHeight * 0.415887);
            ctx.bezierCurveTo(imageWidth * 0.504672, imageHeight * 0.415887, imageWidth * 0.504672, imageHeight * 0.467289, imageWidth * 0.504672, imageHeight * 0.467289);
            ctx.bezierCurveTo(imageWidth * 0.518691, imageHeight * 0.471962, imageWidth * 0.528037, imageHeight * 0.481308, imageWidth * 0.532710, imageHeight * 0.495327);
            ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.495327, imageWidth * 0.584112, imageHeight * 0.495327, imageWidth * 0.584112, imageHeight * 0.495327);
            ctx.lineTo(imageWidth * 0.584112, imageHeight * 0.504672);
            ctx.bezierCurveTo(imageWidth * 0.584112, imageHeight * 0.504672, imageWidth * 0.532710, imageHeight * 0.504672, imageWidth * 0.532710, imageHeight * 0.504672);
            ctx.bezierCurveTo(imageWidth * 0.528037, imageHeight * 0.518691, imageWidth * 0.518691, imageHeight * 0.532710, imageWidth * 0.5, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.481308, imageHeight * 0.532710, imageWidth * 0.471962, imageHeight * 0.518691, imageWidth * 0.467289, imageHeight * 0.504672);
            ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.504672, imageWidth * 0.415887, imageHeight * 0.504672, imageWidth * 0.415887, imageHeight * 0.504672);
            ctx.closePath();
            ctx.fill();

            // Tickmarks
            var step = 5;
            var stepRad = 5 * Math.PI / 180;
//            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(-Math.PI / 2);
            ctx.translate(-centerX, -centerY);

            for (var angle = -90; angle <= 90; angle += step) {
                if (angle % 45 === 0 || angle === 0) {
                    ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.088785);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.113);
                    ctx.closePath();
                    ctx.stroke();
                } else if (angle % 15 === 0) {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.088785);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.103785);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.088785);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.093785);
                    ctx.closePath();
                    ctx.stroke();
                }
                ctx.translate(centerX, centerY);
                ctx.rotate(stepRad, centerX, centerY);
                ctx.translate(-centerX, -centerY);
            }

            ctx.restore();
        };

        var drawIndicatorImage = function(ctx) {
            ctx.save();

            var imgWidth = imageWidth * 0.037383;
            var imgHeight = imageHeight * 0.056074;

            ctx.beginPath();
            ctx.moveTo(imgWidth * 0.5, 0);
            ctx.lineTo(0, imgHeight);
            ctx.lineTo(imgWidth, imgHeight);
            ctx.closePath();

            ctx.fillStyle = pointerColor.light.getRgbaColor();
            ctx.fill();
            ctx.strokeStyle = pointerColor.medium.getRgbaColor();
            ctx.stroke();

            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function() {
            initialized = true;

            if (frameVisible) {
                drawRadialFrameImage(backgroundContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            drawHorizonBackgroundImage(valueContext);

            drawIndicatorImage(indicatorContext);

            drawHorizonForegroundImage(foregroundContext);

            if (foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle, gaugeType);
            }
        };

        var resetBuffers = function() {
            // Buffer for all static background painting code
            backgroundBuffer.width = size;
            backgroundBuffer.height = size;
            backgroundContext = backgroundBuffer.getContext('2d');

            // Buffer for pointer image painting code
            valueBuffer.width = size;
            valueBuffer.height = size * Math.PI;
            valueContext = valueBuffer.getContext('2d');

            // Buffer for the indicator
            indicatorBuffer.width = size * 0.037383;
            indicatorBuffer.height = size * 0.056074;
            indicatorContext = indicatorBuffer.getContext('2d');

            // Buffer for static foreground painting code
            foregroundBuffer.width = size;
            foregroundBuffer.height = size;
            foregroundContext = foregroundBuffer.getContext('2d');
        };

        //************************************ Public methods **************************************
        this.setRoll = function(newRoll) {
            newRoll = newRoll % 360;
            if (roll !== newRoll) {
                roll = newRoll;
                this.repaint();
            }
        };

        this.getRoll = function() {
            return roll;
        };

        this.setRollAnimated = function(newRoll) {
            newRoll = newRoll % 360;
            if (roll !== newRoll) {
                var gauge = this;

                if (undefined !== tweenRoll) {
                    if (tweenRoll.playing) {
                        tweenRoll.stop();
                    }
                }

                tweenRoll = new Tween({},'',Tween.regularEaseInOut, roll, newRoll, 1);

                tweenRoll.onMotionChanged = function(event) {
                    roll = event.target._pos;
                    gauge.repaint();
                };
                tweenRoll.start();
            }
        };

        this.setPitch = function(newPitch) {
            // constrain to range -180..180
            // normal range -90..90 and -180..-90/90..180 indicate inverted
            newPitch = ((newPitch + 180 - pitchOffset) % 360) - 180;
            //pitch = -(newPitch + pitchOffset) % 180;
            if (pitch !== newPitch) {
                pitch = newPitch;
                if (pitch > 90) {
                    pitch = 90 - (pitch - 90);
                    if (!upsidedown) {
                        this.setRoll(roll - 180);
                    }
                    upsidedown = true;
                } else if (pitch < -90) {
                    pitch = -90 + (-90 - pitch);
                    if (!upsidedown) {
                        this.setRoll(roll + 180);
                    }
                    upsidedown = true;
                } else {
                    upsidedown = false;
                }
                this.repaint();
            }
        };

        this.getPitch = function() {
            return pitch;
        };

        this.setPitchAnimated = function(newPitch) {
            // perform all range checking in setPitch()
            if (pitch !== newPitch) {
                if (undefined !== tweenPitch) {
                    if (tweenPitch.playing) {
                        tweenPitch.stop();
                    }
                }
                var gauge = this;
                tweenPitch = new Tween({}, '', Tween.regularEaseInOut, pitch, newPitch, 1);
                tweenPitch.onMotionChanged = function(event) {
                    //pitch = event.target._pos;
                    //gauge.repaint();
                    gauge.setPitch(event.target._pos);
                };
                tweenPitch.start();
            }
        };

        this.setPitchOffset = function(newPitchOffset) {
            pitchOffset = newPitchOffset;
            this.repaint();
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers();
            frameDesign = newFrameDesign;
            init();
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers();
            foregroundType = newForegroundType;
            init();
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            mainCtx.drawImage(backgroundBuffer, 0, 0);

            mainCtx.save();

            // Set the clipping area
            mainCtx.beginPath();
            mainCtx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
            mainCtx.closePath();
            mainCtx.clip();

            // Rotate around roll
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(-(roll * Math.PI / 180));
            mainCtx.translate(-centerX, 0);
            // Translate about dive
            mainCtx.translate(0, (pitch * pitchPixel));

            // Draw horizon
            mainCtx.drawImage(valueBuffer, 0, -valueBuffer.height / 2);

            // Draw the scale and angle indicator
            mainCtx.translate(0, -(pitch * pitchPixel) - centerY);
            mainCtx.drawImage(indicatorBuffer, (imageWidth * 0.5 - indicatorBuffer.width / 2), (imageWidth * 0.107476));
            mainCtx.restore();

            mainCtx.drawImage(foregroundBuffer, 0, 0);

            mainCtx.restore();
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var led = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 32 : parameters.size);
        var ledColor = (undefined === parameters.ledColor ? steelseries.LedColor.RED_LED : parameters.ledColor);

        var ledBlinking = false;
        var ledTimerId = 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var initialized = false;

        // Buffer for led on painting code
        var ledBufferOn = doc.createElement('canvas');
        ledBufferOn.width = size;
        ledBufferOn.height = size;
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = doc.createElement('canvas');
        ledBufferOff.width = size;
        ledBufferOff.height = size;
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        var init = function() {
            initialized = true;

            // Draw LED ON in ledBuffer_ON
            ledContextOn.clearRect(0, 0, ledContextOn.canvas.width, ledContextOn.canvas.height);
            ledContextOn.drawImage(createLedImage(size, 1, ledColor), 0, 0);

            // Draw LED ON in ledBuffer_OFF
            ledContextOff.clearRect(0, 0, ledContextOff.canvas.width, ledContextOff.canvas.height);
            ledContextOff.drawImage(createLedImage(size, 0, ledColor), 0, 0);
        };

        this.toggleLed = function() {
            if (ledBuffer === ledBufferOn) {
                ledBuffer = ledBufferOff;
            } else {
                ledBuffer = ledBufferOn;
            }
            repaint();
        };

        this.setLedColor = function (newColor) {
            ledColor = newColor;
            initialized = false;
            repaint();
        };

        this.setLedOnOff = function(on) {
            if (true === on) {
                ledBuffer = ledBufferOn;
            } else {
                ledBuffer = ledBufferOff;
            }
           repaint();
        };

/*        this.blink = function(blinking) {
            if (blinking) {
                ledTimerId = setInterval(this.toggleLed, 1000);
            } else {
                clearInterval(ledTimerId);
            }
        };
*/
        this.blink = function(blink) {
            if (blink) {
                if (!ledBlinking) {
                    ledTimerId = setInterval(this.toggleLed, 1000);
                    ledBlinking = true;
               }
            } else {
                if (ledBlinking) {
                    clearInterval(ledTimerId);
                    ledBlinking = false;
               }
            }
        };

        var repaint = function() {
            if (!initialized) {
                init();
            }

            mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            mainCtx.drawImage(ledBuffer, 0, 0);

            mainCtx.restore();
        };

        repaint();

        return this;
    };

    var clock = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var pointerType = (undefined === parameters.pointerType ? steelseries.PointerType.TYPE1 : parameters.pointerType);
        var pointerColor = (undefined === parameters.pointerColor ? (pointerType===steelseries.PointerType.TYPE1 ? steelseries.ColorDef.GRAY : steelseries.ColorDef.BLACK ): parameters.pointerColor);
        var backgroundColor = (undefined === parameters.backgroundColor ? (pointerType===steelseries.PointerType.TYPE1 ? steelseries.BackgroundColor.ANTHRACITE : steelseries.BackgroundColor.LIGHT_GRAY) : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);
        var isAutomatic = (undefined === parameters.isAutomatic ? true : parameters.isAutomatic);
        var hour = (undefined === parameters.hour ? 11 : parameters.hour);
        var minute = (undefined === parameters.minute ? 5 : parameters.minute);
        var second = (undefined === parameters.second ? 0 : parameters.second);
        var secondMovesContinuous = (undefined === parameters.secondMovesContinuous ? false : parameters.secondMovesContinuous);
        var timeZoneOffsetHour = (undefined === parameters.timeZoneOffsetHour ? 0 : parameters.timeZoneOffsetHour);
        var timeZoneOffsetMinute = (undefined === parameters.timeZoneOffsetMinute ? 0 : parameters.timeZoneOffsetMinute);
        var secondPointerVisible = (undefined === parameters.secondPointerVisible ? true : parameters.secondPointerVisible);

        // GaugeType specific private variables
        var objDate = new Date();
        var minutePointerAngle;
        var hourPointerAngle;
        var secondPointerAngle;
        var tickTimer;
        var tickInterval = (secondMovesContinuous ? 100 : 1000);
        tickInterval = (secondPointerVisible ? tickInterval : 100);

        var self = this;

        // Constants
        var HALF_PI = Math.PI / 2;
        var TWO_PI = Math.PI * 2;
        var RAD_FACTOR = Math.PI / 180;
        var ANGLE_STEP = 6;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var initialized = false;

        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for hour pointer image painting code
        var hourBuffer = createBuffer(size, size);
        var hourContext = hourBuffer.getContext('2d');

        // Buffer for hour pointer shadow
        var hourShadowBuffer = createBuffer(size, size);
        var hourShadowContext = hourShadowBuffer.getContext('2d');

        // Buffer for minute pointer image painting code
        var minuteBuffer = createBuffer(size, size);
        var minuteContext = minuteBuffer.getContext('2d');

        // Buffer for hour pointer shadow
        var minuteShadowBuffer = createBuffer(size, size);
        var minuteShadowContext = minuteShadowBuffer.getContext('2d');

        // Buffer for second pointer image painting code
        var secondBuffer = createBuffer(size, size);
        var secondContext = secondBuffer.getContext('2d');

        // Buffer for hour pointer shadow
        var secondShadowBuffer = createBuffer(size, size);
        var secondShadowContext = secondShadowBuffer.getContext('2d');

        // Buffer for pointer shadow painting code
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        var drawTickmarksImage = function(ctx, ptrType) {
            var tickAngle;
            var SMALL_TICK_HEIGHT;
            var BIG_TICK_HEIGHT;
            var OUTER_POINT, INNER_POINT;
            OUTER_POINT = imageWidth * 0.405;
            ctx.save();
            ctx.translate(centerX, centerY);

            switch (ptrType.type) {
                case 'type1':
                    // Draw minutes tickmarks
                    SMALL_TICK_HEIGHT = imageWidth * 0.074766;
                    INNER_POINT = OUTER_POINT - SMALL_TICK_HEIGHT;
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = imageWidth * 0.014018;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 30) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(30 * RAD_FACTOR);
                     }

                    // Draw hours tickmarks
                    BIG_TICK_HEIGHT = imageWidth * 0.126168;
                    INNER_POINT = OUTER_POINT - BIG_TICK_HEIGHT;
                    ctx.lineWidth = imageWidth * 0.032710;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 90) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(90 * RAD_FACTOR);
                    }
                    break;

                case 'type2':
                default:
                    // Draw minutes tickmarks
                    SMALL_TICK_HEIGHT = imageWidth * 0.037383;
                    INNER_POINT = OUTER_POINT - SMALL_TICK_HEIGHT;
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = imageWidth * 0.009345;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 6) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(6 * RAD_FACTOR);
                    }

                    // Draw hours tickmarks
                    BIG_TICK_HEIGHT = imageWidth * 0.084112;
                    INNER_POINT = OUTER_POINT - BIG_TICK_HEIGHT;
                    ctx.lineWidth = imageWidth * 0.028037;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 30) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(30 * RAD_FACTOR);
                    }
                    break;
            }
                        ctx.translate(-centerX, -centerY);
                        ctx.restore();
        };

        var drawHourPointer = function(ctx, ptrType, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            }

            switch (ptrType.type) {
                case 'type2':
                    ctx.beginPath();
                    ctx.lineWidth = imageWidth * 0.046728;
                    ctx.moveTo(centerX, imageWidth * 0.289719);
                    ctx.lineTo(centerX, imageWidth * 0.289719 + imageWidth * 0.224299);
                    if (!shadow) {
                        ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case 'type1':
                default:
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.471962, imageHeight * 0.560747);
                    ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.214953);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.182242);
                    ctx.lineTo(imageWidth * 0.528037, imageHeight * 0.214953);
                    ctx.lineTo(imageWidth * 0.528037, imageHeight * 0.560747);
                    ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.560747);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(imageWidth * 0.471962, imageHeight * 0.560747, imageWidth * 0.528037, imageHeight * 0.214953);
                        grad.addColorStop(1, pointerColor.veryLight.getRgbaColor());
                        grad.addColorStop(0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        var drawMinutePointer = function(ctx, ptrType, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            }

            switch (ptrType.type) {
                case 'type2':
                    ctx.beginPath();
                    ctx.lineWidth = imageWidth * 0.032710;
                    ctx.moveTo(centerX, imageWidth * 0.116822);
                    ctx.lineTo(centerX, imageWidth * 0.116822 + imageWidth * 0.387850);
                    if (!shadow) {
                        ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case 'type1':
                default:
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.518691, imageHeight * 0.574766);
                    ctx.lineTo(imageWidth * 0.523364, imageHeight * 0.135514);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.107476);
                    ctx.lineTo(imageWidth * 0.476635, imageHeight * 0.140186);
                    ctx.lineTo(imageWidth * 0.476635, imageHeight * 0.574766);
                    ctx.lineTo(imageWidth * 0.518691, imageHeight * 0.574766);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(imageWidth * 0.518691, imageHeight * 0.574766, imageWidth * 0.476635, imageHeight * 0.140186);
                        grad.addColorStop(1, pointerColor.veryLight.getRgbaColor());
                        grad.addColorStop(0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        var drawSecondPointer = function(ctx, ptrType, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            } else {
                ctx.fillStyle = steelseries.ColorDef.RED.medium.getRgbaColor();
                ctx.strokeStyle = steelseries.ColorDef.RED.medium.getRgbaColor();
            }

            switch (ptrType.type) {
                case 'type2':
                    // top rectangle
                    ctx.lineWidth = imageWidth * 0.009345;
                    ctx.beginPath();
                    ctx.moveTo(centerX, imageWidth * 0.098130);
                    ctx.lineTo(centerX, imageWidth * 0.098130 + imageWidth * 0.126168);
                    ctx.closePath();
                    ctx.stroke();
                    // bottom rectangle
                    ctx.lineWidth = imageWidth * 0.018691;
                    ctx.beginPath();
                    ctx.moveTo(centerX, imageWidth * 0.308411);
                    ctx.lineTo(centerX, imageWidth * 0.308411 + imageWidth * 0.191588);
                    ctx.closePath();
                    ctx.stroke();
                    // circle
                    ctx.lineWidth = imageWidth * 0.016;
                    ctx.beginPath();
                    ctx.arc(centerX, imageWidth * 0.26, imageWidth * 0.085 / 2, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case 'type1':
                default:
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.509345, imageHeight * 0.116822);
                    ctx.lineTo(imageWidth * 0.509345, imageHeight * 0.574766);
                    ctx.lineTo(imageWidth * 0.490654, imageHeight * 0.574766);
                    ctx.lineTo(imageWidth * 0.490654, imageHeight * 0.116822);
                    ctx.lineTo(imageWidth * 0.509345, imageHeight * 0.116822);
                    ctx.closePath();
                    if (!shadow) {
                      grad = ctx.createLinearGradient(imageWidth * 0.509345, imageHeight * 0.116822, imageWidth * 0.490654, imageHeight * 0.574766);
                      grad.addColorStop(0, steelseries.ColorDef.RED.light.getRgbaColor());
                      grad.addColorStop(0.47, steelseries.ColorDef.RED.medium.getRgbaColor());
                      grad.addColorStop(1, steelseries.ColorDef.RED.dark.getRgbaColor());
                      ctx.fillStyle = grad;
                      ctx.strokeStyle = steelseries.ColorDef.RED.dark.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        var drawKnob = function(ctx) {
            var shadowOffset = imageWidth * 0.006;
            var grad;

            // draw the knob
            ctx.beginPath();
            ctx.arc(centerX, centerY, imageWidth * 0.045, 0 , TWO_PI);
            ctx.closePath();
            grad = ctx.createLinearGradient(centerX - imageWidth * 0.045/2, centerY - imageWidth * 0.045/2, centerX + imageWidth * 0.045/2, centerY + imageWidth * 0.045/2);
            grad.addColorStop(0, '#eef0f2');
            grad.addColorStop(1, '#65696d');
            ctx.fillStyle = grad;
            ctx.fill();
        };

        var drawTopKnob = function(ctx, ptrType) {
            var shadowOffset = imageWidth * 0.006;
            var grad;

            ctx.save();

            switch (ptrType.type) {
                case 'type2':
                    // draw knob
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, imageWidth * 0.088785 / 2, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type1':
                default:
                    // draw knob
                    grad = ctx.createLinearGradient(centerX - imageWidth * 0.027 /2, centerY - imageWidth * 0.027 /2, centerX + imageWidth * 0.027 /2, centerY + imageWidth * 0.027 /2);
                    grad.addColorStop(0, '#f3f4f7');
                    grad.addColorStop(0.11, '#f3f5f7');
                    grad.addColorStop(0.12, '#f1f3f5');
                    grad.addColorStop(0.2, '#c0c5cb');
                    grad.addColorStop(0.2, '#bec3c9');
                    grad.addColorStop(1, '#bec3c9');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, imageWidth * 0.027, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.fill();
                    break;
            }

            ctx.restore();
        };

        var calculateAngles = function(hour, minute, second) {
            secondPointerAngle = second * ANGLE_STEP * RAD_FACTOR;
            minutePointerAngle = minute * ANGLE_STEP * RAD_FACTOR;
            hourPointerAngle = (hour + minute / 60) * ANGLE_STEP * 5 * RAD_FACTOR;
        };

        var tickTock = function() {
            if (isAutomatic) {
                objDate = new Date();
            } else {
                objDate.setHours(hour);
                objDate.setMinutes(minute);
                objDate.setSeconds(second);
            }
            // Seconds
            second = objDate.getSeconds() + (secondMovesContinuous ? objDate.getMilliseconds() / 1000 : 0);

            // Hours
            if (timeZoneOffsetHour != 0 && timeZoneOffsetMinute !=0) {
                hour = objDate.getUTCHours() + timeZoneOffsetHour;
            } else {
                hour = objDate.getHours();
            }
            hour = hour % 12;

            // Minutes
            if (timeZoneOffsetHour != 0 && timeZoneOffsetMinute !=0) {
                minute = objDate.getUTCMinutes() + timeZoneOffsetMinute;
            } else {
                minute = objDate.getMinutes();
            }
            if (minute > 60) {
                minute -= 60;
                hour++;
            }
            if (minute < 0) {
                minute += 60;
                hour--;
            }
            hour = hour % 12;
            // Calculate angles from current hour and minute values
            calculateAngles(hour, minute, second);

            if (isAutomatic) {
                tickTimer = setTimeout(tickTock, tickInterval);
            }

            self.repaint();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawPointers = (undefined === parameters.pointers ? false : parameters.pointers);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (drawBackground && backgroundVisible) {
                // Create background in background buffer (backgroundBuffer)
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);

                drawTickmarksImage(backgroundContext, pointerType);
            }

            if (drawPointers) {
                drawHourPointer(hourContext, pointerType, false);
                drawHourPointer(hourShadowContext, pointerType, true);
                drawMinutePointer(minuteContext, pointerType, false);
                drawMinutePointer(minuteShadowContext, pointerType, true);
                drawSecondPointer(secondContext, pointerType, false);
                drawSecondPointer(secondShadowContext, pointerType, true);
            }

            if (drawForeground && foregroundVisible) {
                drawTopKnob(foregroundContext, pointerType);
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetPointers = (undefined === buffers.pointers ? false : buffers.pointers);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if (resetPointers) {
                hourBuffer.width = size;
                hourBuffer.height = size;
                hourContext = hourBuffer.getContext('2d');

                hourShadowBuffer.width = size;
                hourShadowBuffer.height = size;
                hourShadowContext = hourShadowBuffer.getContext('2d');

                minuteBuffer.width = size;
                minuteBuffer.height = size;
                minuteContext = minuteBuffer.getContext('2d');

                minuteShadowBuffer.width = size;
                minuteShadowBuffer.height = size;
                minuteShadowContext = minuteShadowBuffer.getContext('2d');

                secondBuffer.width = size;
                secondBuffer.height = size;
                secondContext = secondBuffer.getContext('2d');

                secondShadowBuffer.width = size;
                secondShadowBuffer.height = size;
                secondShadowContext = secondShadowBuffer.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
           }

            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        //************************************ Public methods **************************************
        this.getAutomatic = function() {
            return isAutomatic;
        };

        this.setAutomatic = function(newValue) {
            if (isAutomatic && !newValue) {
                // stop the clock!
                clearTimer(tickTimer);
                isAutomatic = newValue
            } else if (!isAutomatic && newValue){
                // start the clock
                isAutomatic = newValue;
                tickTock();
            }
        };

        this.getHour = function() {
            return hour;
        };

        this.setHour = function(newValue) {
            newValue = newValue % 12;
            if (hour !== newValue) {
                hour = newValue;
                calculateAngles(hour, minute, second);
                this.repaint();
            }
        };

        this.getMinute = function() {
            return minute;
        };

        this.setMinute = function(newValue) {
            newValue = newValue % 60;
            if (minute !== newValue) {
                minute = newValue;
                calculateAngles(hour, minute, second);
                this.repaint();
            }
        };

        this.getSecond = function() {
            return second;
        };

        this.setSecond = function(newValue) {
            second = newValue % 60;
            if (second !== newValue) {
                second = newValue;
                calculateAngles(hour, minute, second);
                this.repaint();
            }
        };

        this.getTimeZoneOffsetHour = function() {
            return timeZoneOffsetHour;
        };

        this.setTimeZoneOffsetHour = function(newValue) {
            timeZoneOffsetHour = newValue;
            this.repaint();
        };

        this.getTimeZoneOffsetMinute = function() {
            return timeZoneOffsetMinute;
        };

        this.setTimeZoneOffsetMinute = function(newValue) {
            timeZoneOffsetMinute = newValue;
            this.repaint();
        };

        this.getSecondPointerVisible = function() {
            return secondPointerVisible;
        };

        this.setSecondPointerVisible = function(newValue) {
            secondPointerVisible = newValue;
            this.repaint();
        };

        this.getSecondMovesContinuous = function() {
            return secondMovesContinuous;
        };

        this.setSecondMovesContinuous = function(newValue) {
            secondMovesContinuous = newValue;
            tickInterval = (secondMovesContinuous ? 100 : 1000);
            tickInterval = (secondPointerVisible ? tickInterval : 100);
         };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();

        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({ frame: true,
                           background: true });
            backgroundColor = newBackgroundColor;
            init({ frame: true,
                   background: true });
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setPointerType = function(newPointerType) {
            resetBuffers({ foreground: true,
                           pointers: true });
            pointerType = newPointerType;
            if (pointerType.type === 'type1') {
                pointerColor = steelseries.ColorDef.GRAY;
                backgroundColor = steelseries.BackgroundColor.ANTHRACITE;
            } else {
                pointerColor = steelseries.ColorDef.BLACK;
                backgroundColor = steelseries.BackgroundColor.LIGHT_GRAY;
            }
            init({ background: true,
                   foreground: true,
                   pointers: true });
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers({pointers: true});
            pointerColor = newPointerColor;
            init({pointers: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      pointers: true,
                      foreground: true});
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            if (backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            // have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            // draw hour pointer shadow
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(hourPointerAngle);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(hourShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            // draw hour pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(hourPointerAngle);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(hourBuffer, 0, 0);
            mainCtx.restore();

            // draw minute pointer shadow
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(minutePointerAngle);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(minuteShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            // draw minute pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(minutePointerAngle);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(minuteBuffer, 0, 0);
            mainCtx.restore();

            if (pointerType.type==='type1'){
                drawKnob(mainCtx);
            }

            if (secondPointerVisible) {
                // draw second pointer shadow
                pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
                pointerRotContext.save();
                pointerRotContext.translate(centerX, centerY);
                pointerRotContext.rotate(secondPointerAngle);
                pointerRotContext.translate(-centerX, -centerY);
                pointerRotContext.drawImage(secondShadowBuffer, 0, 0);
                pointerRotContext.restore();
                mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

                // draw second pointer
                mainCtx.save();
                mainCtx.translate(centerX, centerY);
                mainCtx.rotate(secondPointerAngle);
                mainCtx.translate(-centerX, -centerY);
                mainCtx.drawImage(secondBuffer, 0, 0);
                mainCtx.restore();
            }

            // Draw foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        tickTock();

        return this;
    };

    var battery = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 50 : parameters.size);
        var value = (undefined === parameters.value ? 50 : parameters.value);

        var imageWidth = size;
        var imageHeight = Math.ceil(size * 0.45);

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = imageWidth;
        mainCtx.canvas.height = imageWidth;

        var createBatteryImage = function(ctx, imageWidth, imageHeight, value) {
            var grad;

            // Background
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.025, imageHeight * 0.055555);
            ctx.lineTo(imageWidth * 0.9, imageHeight * 0.055555);
            ctx.lineTo(imageWidth * 0.9, imageHeight * 0.944444);
            ctx.lineTo(imageWidth * 0.025, imageHeight * 0.944444);
            ctx.lineTo(imageWidth * 0.025, imageHeight * 0.055555);
            ctx.closePath();
            //
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.925, 0);
            ctx.lineTo(0, 0);
            ctx.lineTo(0, imageHeight);
            ctx.lineTo(imageWidth * 0.925, imageHeight);
            ctx.lineTo(imageWidth * 0.925, imageHeight * 0.722222);
            ctx.bezierCurveTo(imageWidth * 0.925, imageHeight * 0.722222, imageWidth * 0.975, imageHeight * 0.722222, imageWidth * 0.975, imageHeight * 0.722222);
            ctx.bezierCurveTo(imageWidth, imageHeight * 0.722222, imageWidth, imageHeight * 0.666666, imageWidth, imageHeight * 0.666666);
            ctx.bezierCurveTo(imageWidth, imageHeight * 0.666666, imageWidth, imageHeight * 0.333333, imageWidth, imageHeight * 0.333333);
            ctx.bezierCurveTo(imageWidth, imageHeight * 0.333333, imageWidth, imageHeight * 0.277777, imageWidth * 0.975, imageHeight * 0.277777);
            ctx.bezierCurveTo(imageWidth * 0.975, imageHeight * 0.277777, imageWidth * 0.925, imageHeight * 0.277777, imageWidth * 0.925, imageHeight * 0.277777);
            ctx.lineTo(imageWidth * 0.925, 0);
            ctx.closePath();
            //
            grad = ctx.createLinearGradient(0, 0, 0, imageHeight);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#7e7e7e');
            ctx.fillStyle = grad;
            ctx.fill();

            // Main
            ctx.beginPath();
            var end = Math.max(imageWidth * 0.875 * (value / 100), Math.ceil(imageWidth * 0.01));
            ctx.rect(imageWidth * 0.025, imageWidth * 0.025, end, imageHeight * 0.888888);
            ctx.closePath();
            var BORDER_FRACTIONS = [0, 0.4, 1];
            var BORDER_COLORS = [
                                new rgbaColor(177, 25, 2, 1),   // 0xB11902
                                new rgbaColor(219, 167, 21, 1), // 0xDBA715
                                new rgbaColor(121, 162, 75, 1)  // 0x79A24B
                                ];
            var border = new gradientWrapper(0, 100, BORDER_FRACTIONS, BORDER_COLORS);
            ctx.fillStyle = border.getColorAt(value / 100).getRgbColor();
            ctx.fill();
            ctx.beginPath();
            end = Math.max(end - imageWidth * 0.05, 0)
            ctx.rect(imageWidth * 0.05, imageWidth * 0.05, end, imageHeight * 0.777777);
            ctx.closePath();
            var LIQUID_COLORS_DARK = [
                                new rgbaColor(198, 39, 5, 1),   // 0xC62705
                                new rgbaColor(228, 189, 32, 1), // 0xE4BD20
                                new rgbaColor(163, 216, 102, 1) // 0xA3D866
                                ];

            var LIQUID_COLORS_LIGHT = [
                                new rgbaColor(246, 121, 48, 1),   // 0xF67930
                                new rgbaColor(246, 244, 157, 1),  // 0xF6F49D
                                new rgbaColor(223, 233, 86, 1)    // 0xDFE956
                                ];
            var LIQUID_GRADIENT_FRACTIONS = [0, 0.4, 1];
            var liquidDark = new gradientWrapper(0, 100, LIQUID_GRADIENT_FRACTIONS, LIQUID_COLORS_DARK);
            var liquidLight = new gradientWrapper(0, 100, LIQUID_GRADIENT_FRACTIONS, LIQUID_COLORS_LIGHT);
            grad = ctx.createLinearGradient(imageWidth * 0.05, 0, imageWidth * 0.875, 0);
            grad.addColorStop(0, liquidDark.getColorAt(value / 100).getRgbColor());
            grad.addColorStop(0.5, liquidLight.getColorAt(value / 100).getRgbColor());
            grad.addColorStop(1, liquidDark.getColorAt(value / 100).getRgbColor());
            ctx.fillStyle = grad;
            ctx.fill();

            // Foreground
            ctx.beginPath();
            ctx.rect(imageWidth * 0.025, imageWidth * 0.025, imageWidth * 0.875, imageHeight * 0.444444);
            ctx.closePath();
            grad = ctx.createLinearGradient(imageWidth * 0.025, imageWidth * 0.025, imageWidth * 0.875, imageHeight * 0.444444);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            ctx.fillStyle = grad;
            ctx.fill();
        };

        // **************   Public methods  ********************
        this.setValue = function(newValue) {
            newValue = (newValue < 0 ? 0 : (newValue > 100 ? 100 : newValue));
            if (value !== newValue) {
                value = newValue;
                this.repaint();
            }

        };

        this.getValue = function() {
            return value;
        };

        this.repaint = function() {
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
            createBatteryImage(mainCtx, imageWidth, imageHeight, value);
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var stopwatch = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.BLACK : parameters.pointerColor);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.LIGHT_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);

        var minutePointerAngle = 0;
        var secondPointerAngle = 0;
        var tickTimer;
        var ANGLE_STEP = 6;
        var TWO_PI = Math.PI * 2;
        var RAD_FACTOR = Math.PI / 180;
        var self = this;

        var start = 0;
        var currentMilliSeconds = 0;
        var minutes = 0;
        var seconds = 0;
        var milliSeconds = 0;
        var running = false;
        var lap = false;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var smallPointerSize = 0.285 * imageWidth;
        var smallPointerX_Offset = centerX - smallPointerSize / 2;
        var smallPointerY_Offset = 0.17 * imageWidth;

        var initialized = false;

        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for small pointer image painting code
        var smallPointerBuffer = createBuffer(size, size);
        var smallPointerContext = smallPointerBuffer.getContext('2d');

        // Buffer for small pointer shadow
        var smallPointerShadowBuffer = createBuffer(size, size);
        var smallPointerShadowContext = smallPointerShadowBuffer.getContext('2d');

        // Buffer for large pointer image painting code
        var largePointerBuffer = createBuffer(size, size);
        var largePointerContext = largePointerBuffer.getContext('2d');

        // Buffer for hour pointer shadow
        var largePointerShadowBuffer = createBuffer(size, size);
        var largePointerShadowContext = largePointerShadowBuffer.getContext('2d');

        // Buffer for pointer shadow painting code
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        var drawTickmarksImage = function(ctx, width, range, text_scale, text_dist_factor, x_offset, y_offset) {
            var tickAngle;

            ctx.width = ctx.height = width;

            var STD_FONT_SIZE = text_scale * width;
            var STD_FONT = STD_FONT_SIZE + "px sans-serif";
            var TEXT_WIDTH = width * 0.15;
            var THIN_STROKE = 0.5;
            var MEDIUM_STROKE = 1;
            var THICK_STROKE = 1.5;
            var TEXT_DISTANCE = text_dist_factor * width;
            var MIN_LENGTH = Math.round(0.025 * width)
            var MED_LENGTH = Math.round(0.035 * width);
            var MAX_LENGTH = Math.round(0.045 * width);
            var TEXT_COLOR = backgroundColor.labelColor.getRgbaColor();
            var TICK_COLOR = backgroundColor.labelColor.getRgbaColor();
            var CENTER = width / 2;

            // Create the ticks itself
            var RADIUS = width * 0.4;
            var counter = 0;
            var numberCounter = 0;
            var tickCounter = 0;
            var sinValue = 0;
            var cosValue = 0;

            var alpha; // angle for the tickmarks
            var ALPHA_START = -Math.PI;
            var valueCounter; // value for the tickmarks

            var ANGLE_STEPSIZE = (2 * Math.PI) / (range);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = STD_FONT;

            for (alpha = ALPHA_START, valueCounter = 0; valueCounter <= range + 1; alpha -= ANGLE_STEPSIZE * 0.1, valueCounter += 0.1) {
                ctx.lineWidth = THIN_STROKE;
                sinValue = Math.sin(alpha);
                cosValue = Math.cos(alpha);

                // tickmark every 2 units
                if (counter % 2 === 0) {
                    //ctx.lineWidth = THIN_STROKE;
                    innerPoint = [CENTER + (RADIUS - MIN_LENGTH) * sinValue + x_offset, CENTER + (RADIUS - MIN_LENGTH) * cosValue + y_offset];
                    outerPoint = [CENTER + RADIUS * sinValue + x_offset, CENTER + RADIUS * cosValue + y_offset];
                    // Draw ticks
                    ctx.strokeStyle = TICK_COLOR;
                    ctx.beginPath();
                    ctx.moveTo(innerPoint[0], innerPoint[1]);
                    ctx.lineTo(outerPoint[0], outerPoint[1]);
                    ctx.closePath();
                    ctx.stroke();
                }

                // Different tickmark every 10 units
                if (counter === 10 || counter === 0) {
                    ctx.fillStyle = TEXT_COLOR;
                    ctx.lineWidth = MEDIUM_STROKE;
                    outerPoint = [CENTER + RADIUS * sinValue + x_offset, CENTER + RADIUS * cosValue + y_offset];
                    textPoint  = [CENTER + (RADIUS - TEXT_DISTANCE) * sinValue + x_offset, CENTER + (RADIUS - TEXT_DISTANCE) * cosValue + y_offset];

                    // Draw text
                    if (numberCounter === 5) {
                        if (valueCounter !== range) {
                            if (Math.round(valueCounter) !== 60) {
                                ctx.fillText(Math.round(valueCounter), textPoint[0], textPoint[1], TEXT_WIDTH);
                            }
                        }
                        ctx.lineWidth = THICK_STROKE;
                        innerPoint = [CENTER + (RADIUS - MAX_LENGTH) * sinValue + x_offset, CENTER + (RADIUS - MAX_LENGTH) * cosValue + y_offset];
                        numberCounter = 0;
                    } else {
                        ctx.lineWidth = MEDIUM_STROKE;
                        innerPoint = [CENTER + (RADIUS - MED_LENGTH) * sinValue + x_offset, CENTER + (RADIUS - MED_LENGTH) * cosValue + y_offset];
                    }

                    // Draw ticks
                    ctx.strokeStyle = TICK_COLOR;
                    ctx.beginPath();
                    ctx.moveTo(innerPoint[0], innerPoint[1]);
                    ctx.lineTo(outerPoint[0], outerPoint[1]);
                    ctx.closePath();
                    ctx.stroke();

                    counter = 0;
                    tickCounter++;
                    numberCounter++;
                }
                counter++;
            }
            ctx.restore();
        };

        var drawLargePointer = function(ctx, shadow) {
            var grad;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.509345, imageWidth * 0.457943);
            ctx.lineTo(imageWidth * 0.5, imageWidth * 0.102803);
            ctx.lineTo(imageWidth * 0.490654, imageWidth * 0.457943);
            ctx.bezierCurveTo(imageWidth * 0.490654, imageWidth * 0.457943, imageWidth * 0.490654, imageWidth * 0.457943, imageWidth * 0.490654, imageWidth * 0.457943);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageWidth * 0.462616, imageWidth * 0.457943, imageWidth * 0.481308, imageWidth * 0.457943, imageWidth * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.457943, imageWidth * 0.518691, imageWidth * 0.471962, imageWidth * 0.537383, imageWidth * 0.490654, imageWidth * 0.542056);
            ctx.bezierCurveTo(imageWidth * 0.490654, imageWidth * 0.542056, imageWidth * 0.490654, imageWidth * 0.542056, imageWidth * 0.490654, imageWidth * 0.542056);
            ctx.lineTo(imageWidth * 0.490654, imageWidth * 0.621495);
            ctx.lineTo(imageWidth * 0.509345, imageWidth * 0.621495);
            ctx.lineTo(imageWidth * 0.509345, imageWidth * 0.542056);
            ctx.bezierCurveTo(imageWidth * 0.509345, imageWidth * 0.542056, imageWidth * 0.509345, imageWidth * 0.542056, imageWidth * 0.509345, imageWidth * 0.542056);
            ctx.bezierCurveTo(imageWidth * 0.528037, imageWidth * 0.537383, imageWidth * 0.542056, imageWidth * 0.518691, imageWidth * 0.542056, imageWidth * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.542056, imageWidth * 0.481308, imageWidth * 0.528037, imageWidth * 0.462616, imageWidth * 0.509345, imageWidth * 0.457943);
            ctx.bezierCurveTo(imageWidth * 0.509345, imageWidth * 0.457943, imageWidth * 0.509345, imageWidth * 0.457943, imageWidth * 0.509345, imageWidth * 0.457943);
            ctx.closePath();
            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fill();
            } else {
                grad = ctx.createLinearGradient(0, 0, 0, imageWidth * 0.621495);
                grad.addColorStop(0, pointerColor.medium.getRgbaColor());
                grad.addColorStop(0.388888, pointerColor.medium.getRgbaColor());
                grad.addColorStop(0.5, pointerColor.light.getRgbaColor());
                grad.addColorStop(0.611111, pointerColor.medium.getRgbaColor());
                grad.addColorStop(1, pointerColor.medium.getRgbaColor());
                ctx.fillStyle = grad;
                ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                ctx.fill();
                ctx.stroke();
            }
            if (!shadow) {
                // Draw the rings
                ctx.beginPath();
                var radius = imageWidth * 0.065420 / 2;
                ctx.arc(centerX, centerY, radius, 0, TWO_PI);
                grad = ctx.createLinearGradient(centerX - radius, centerX + radius, 0, centerX + radius);
                grad.addColorStop(0, '#e6b35c');
                grad.addColorStop(0.01, '#e6b35c');
                grad.addColorStop(0.99, '#c48200');
                grad.addColorStop(1, '#c48200');
                ctx.fillStyle = grad;
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                radius = imageWidth * 0.046728 / 2;
                ctx.arc(centerX, centerY, radius, 0, TWO_PI);
                grad = ctx.createRadialGradient(centerX, centerX, 0, centerX, centerX, radius);
                grad.addColorStop(0, '#c5c5c5');
                grad.addColorStop(0.19, '#c5c5c5');
                grad.addColorStop(0.22, '#000000');
                grad.addColorStop(0.8, '#000000');
                grad.addColorStop(0.99, '#707070');
                grad.addColorStop(1, '#707070');
                ctx.fillStyle = grad;
                ctx.closePath();
                ctx.fill();
             } else {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
             }
            ctx.restore();
        };

        var drawSmallPointer = function(ctx, shadow) {
            var grad;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.476635, imageWidth * 0.313084);
            ctx.bezierCurveTo(imageWidth * 0.476635, imageWidth * 0.322429, imageWidth * 0.485981, imageWidth * 0.331775, imageWidth * 0.495327, imageWidth * 0.336448);
            ctx.bezierCurveTo(imageWidth * 0.495327, imageWidth * 0.336448, imageWidth * 0.495327, imageWidth * 0.350467, imageWidth * 0.495327, imageWidth * 0.350467);
            ctx.lineTo(imageWidth * 0.504672, imageWidth * 0.350467);
            ctx.bezierCurveTo(imageWidth * 0.504672, imageWidth * 0.350467, imageWidth * 0.504672, imageWidth * 0.336448, imageWidth * 0.504672, imageWidth * 0.336448);
            ctx.bezierCurveTo(imageWidth * 0.514018, imageWidth * 0.331775, imageWidth * 0.523364, imageWidth * 0.322429, imageWidth * 0.523364, imageWidth * 0.313084);
            ctx.bezierCurveTo(imageWidth * 0.523364, imageWidth * 0.303738, imageWidth * 0.514018, imageWidth * 0.294392, imageWidth * 0.504672, imageWidth * 0.289719);
            ctx.bezierCurveTo(imageWidth * 0.504672, imageWidth * 0.289719, imageWidth * 0.5, imageWidth * 0.200934, imageWidth * 0.5, imageWidth * 0.200934);
            ctx.bezierCurveTo(imageWidth * 0.5, imageWidth * 0.200934, imageWidth * 0.495327, imageWidth * 0.289719, imageWidth * 0.495327, imageWidth * 0.289719);
            ctx.bezierCurveTo(imageWidth * 0.485981, imageWidth * 0.294392, imageWidth * 0.476635, imageWidth * 0.303738, imageWidth * 0.476635, imageWidth * 0.313084);
            ctx.closePath();
            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fill();
            } else {
                grad = ctx.createLinearGradient(0, 0, imageWidth, 0);
                grad.addColorStop(0, pointerColor.medium.getRgbaColor());
                grad.addColorStop(0.388888, pointerColor.medium.getRgbaColor());
                grad.addColorStop(0.5, pointerColor.light.getRgbaColor());
                grad.addColorStop(0.611111, pointerColor.medium.getRgbaColor());
                grad.addColorStop(1, pointerColor.medium.getRgbaColor());
                ctx.fillStyle = grad;
                ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                ctx.fill();
                ctx.stroke();
            }
            if (!shadow) {
                // Draw the rings
                ctx.beginPath();
                var radius = imageWidth * 0.037383 / 2;
                ctx.arc(centerX, smallPointerY_Offset + smallPointerSize / 2, radius, 0, TWO_PI);
                ctx.fillStyle = '#C48200';
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                radius = imageWidth * 0.028037 / 2;
                ctx.arc(centerX, smallPointerY_Offset + smallPointerSize / 2, radius, 0, TWO_PI);
                ctx.fillStyle = '#999999';
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                radius = imageWidth * 0.018691 / 2;
                ctx.arc(centerX, smallPointerY_Offset + smallPointerSize / 2, radius, 0, TWO_PI);
                ctx.fillStyle = '#000000';
                ctx.closePath();
                ctx.fill();
            } else {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        var calculateAngles = function() {
            currentMilliSeconds = new Date().getTime() - start;
            secondPointerAngle = (currentMilliSeconds * ANGLE_STEP / 1000);
            minutePointerAngle = (secondPointerAngle % 10800) / 30;

            minutes = (currentMilliSeconds / 60000) % 30;
            seconds = (currentMilliSeconds / 1000) % 60;
            milliSeconds = (currentMilliSeconds) % 1000;
        };

        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawPointers = (undefined === parameters.pointers ? false : parameters.pointers);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (drawBackground && backgroundVisible) {
                // Create background in background buffer (backgroundBuffer)
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);

                drawTickmarksImage(backgroundContext, imageWidth, 60, 0.075, 0.1, 0, 0);
                drawTickmarksImage(backgroundContext, smallPointerSize, 30, 0.095, 0.13, smallPointerX_Offset, smallPointerY_Offset);
            }
            if (drawPointers) {
                drawLargePointer(largePointerContext, false);
                drawLargePointer(largePointerShadowContext, true);
                drawSmallPointer(smallPointerContext, false);
                drawSmallPointer(smallPointerShadowContext, true);
            }

            if (drawForeground && foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetPointers = (undefined === buffers.pointers ? false : buffers.pointers);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if (resetPointers) {
                smallPointerBuffer.width = size;
                smallPointerBuffer.height = size;
                smallPointerContext= smallPointerBuffer.getContext('2d');

                smallPointerShadowBuffer.width = size;
                smallPointerShadowBuffer.height = size;
                smallPointerShadowContext = smallPointerShadowBuffer.getContext('2d');

                largePointerBuffer.width = size;
                largePointerBuffer.height = size;
                largePointerContext = largePointerBuffer.getContext('2d');

                largePointerShadowBuffer.width = size;
                largePointerShadowBuffer.height = size;
                largePointerShadowContext = largePointerShadowBuffer.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
           }

            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        var tickTock = function() {
            if (!lap) {
                calculateAngles();
                self.repaint();
            }
            if (running) {
                tickTimer = setTimeout(tickTock, 200);
            }

        };

        //************************************ Public methods **************************************
        // Returns true if the stopwatch is running
        this.isRunning = function() {
            return running;
        };

        // Starts the stopwatch
        this.start = function() {
            if (!running) {
                running = true;
                start = new Date().getTime() - currentMilliSeconds;
                tickTock();
            }
        };

        // Stops the stopwatch
        this.stop = function() {
            if (running) {
                running = false;
                clearTimeout(tickTimer);
                //calculateAngles();
            }
            if (lap) {
                lap = false;
                calculateAngles();
                this.repaint();
            }
        };

        // Resets the stopwatch
        this.reset = function() {
            if (running) {
                running = false;
                lap = false;
                clearTimeout(tickTimer);
            }
            start = new Date().getTime();
            calculateAngles();
            this.repaint();
        };

        // Laptimer, stop/restart stopwatch
        this.lap = function() {
            if (running && !lap) {
                lap = true;
            } else if (lap) {
                lap = false;
            }
        };

        this.getMeasuredTime = function() {
            return (minutes + ":" + seconds + ":" + milliSeconds);
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();

        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({ background: true });
            backgroundColor = newBackgroundColor;
            init({ background: true });
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setPointerColor = function(newPointerColor) {
            resetBuffers({pointers: true});
            pointerColor = newPointerColor;
            init({pointers: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      pointers: true,
                      foreground: true});
            }

            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            if (backgroundVisible) {
                mainCtx.drawImage(backgroundBuffer, 0, 0);
            }

            // have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            // Draw minute pointer shadow
            var rotationAngle = (minutePointerAngle + (2 * Math.sin(minutePointerAngle * RAD_FACTOR))) * RAD_FACTOR;
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, smallPointerY_Offset + smallPointerSize / 2);
            pointerRotContext.rotate(rotationAngle);
            pointerRotContext.translate(-centerX, -(smallPointerY_Offset + smallPointerSize / 2));
            pointerRotContext.drawImage(smallPointerShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset/2, shadowOffset/2, imageWidth + shadowOffset/2, imageHeight + shadowOffset/2);

            // Draw the minute pointer
            mainCtx.save();
            mainCtx.translate(centerX, smallPointerY_Offset + smallPointerSize / 2);
            mainCtx.rotate(rotationAngle);
            mainCtx.translate(-centerX, -(smallPointerY_Offset + smallPointerSize / 2));
            mainCtx.drawImage(smallPointerBuffer, 0 , 0);
            mainCtx.restore();

            // Draw second pointer shadow
            rotationAngle = (secondPointerAngle + (2 * Math.sin(secondPointerAngle * RAD_FACTOR))) * RAD_FACTOR;
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(rotationAngle);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(largePointerShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            // Draw the second pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(rotationAngle);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(largePointerBuffer, 0 , 0);
            mainCtx.restore();

            // Draw the foreground
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }
        };

        // Visualize the component
        start = new Date().getTime();
        tickTock();

        return this;
    };

    var altimeter = function(canvas, parameters) {
        parameters = parameters || {};
        var size = (undefined === parameters.size ? 200 : parameters.size);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
        var backgroundVisible = (undefined === parameters.backgroundVisible ? true : parameters.backgroundVisible);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.METAL_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.BLACK : parameters.knobStyle);
        var lcdColor = (undefined === parameters.lcdColor ? steelseries.LcdColor.BLACK : parameters.lcdColor);
        var lcdVisible = (undefined === parameters.lcdVisible ? true : parameters.lcdVisible);
        var digitalFont = (undefined === parameters.digitalFont ? false : parameters.digitalFont);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
        var foregroundVisible = (undefined === parameters.foregroundVisible ? true : parameters.foregroundVisible);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);

        var minValue = 0;
        var maxValue = 10;
        var value = minValue;
        var value100 = 0;
        var value1000 = 0;
        var value10000 = 0;
        var angleStep100ft;
        var angleStep1000ft;
        var angleStep10000ft;
        var tickLabelPeriod = 1; // Draw value at every 10th tickmark
        var tween;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight / 2;

        var stdFont = Math.floor(imageWidth * 0.09) + 'px sans-serif';

        // Constants
        var HALF_PI = Math.PI / 2;
        var RAD_FACTOR = Math.PI / 180;
        var TICKMARK_OFFSET = Math.PI;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for the frame
        var frameBuffer = createBuffer(size, size);
        var frameContext = frameBuffer.getContext('2d');

        // Buffer for the background
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        var lcdBuffer;

        // Buffer for 10000ft pointer image painting code
        var pointer10000Buffer = createBuffer(size, size);
        var pointer10000Context = pointer10000Buffer.getContext('2d');

        // Buffer for 10000ft pointer shadow
        var pointer10000ShadowBuffer = createBuffer(size, size);
        var pointer10000ShadowContext = pointer10000ShadowBuffer.getContext('2d');

        // Buffer for 1000ft pointer image painting code
        var pointer1000Buffer = createBuffer(size, size);
        var pointer1000Context = pointer1000Buffer.getContext('2d');

        // Buffer for 1000ft pointer shadow
        var pointer1000ShadowBuffer = createBuffer(size, size);
        var pointer1000ShadowContext = pointer1000ShadowBuffer.getContext('2d');

        // Buffer for 100ft pointer image painting code
        var pointer100Buffer = createBuffer(size, size);
        var pointer100Context = pointer100Buffer.getContext('2d');

        // Buffer for 100ft pointer shadow
        var pointer100ShadowBuffer = createBuffer(size, size);
        var pointer100ShadowContext = pointer100ShadowBuffer.getContext('2d');

        // Buffer for pointer shadow rotation
        var pointerRotBuffer = createBuffer(size, size);
        var pointerRotContext = pointerRotBuffer.getContext('2d');

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

        // **************   Image creation  ********************
        var drawLcdText = function(value) {
            mainCtx.save();
            mainCtx.textAlign = 'right';
            mainCtx.textBaseline = 'middle';
            mainCtx.strokeStyle = lcdColor.textColor;
            mainCtx.fillStyle = lcdColor.textColor;

            if (lcdColor === steelseries.LcdColor.STANDARD || lcdColor === steelseries.LcdColor.STANDARD_GREEN) {
                mainCtx.shadowColor = 'gray';
                mainCtx.shadowOffsetX = imageWidth * 0.007;
                mainCtx.shadowOffsetY = imageWidth * 0.007;
                mainCtx.shadowBlur = imageWidth * 0.009;
            }
            if (digitalFont) {
                mainCtx.font = Math.floor(imageWidth * 0.075) + 'px ' + lcdFontName;
            } else {
                mainCtx.font = Math.floor(imageWidth * 0.075) + 'px sans-serif';
            }
            mainCtx.fillText(Math.round(value), (imageWidth + (imageWidth * 0.4)) / 2 - 4, imageWidth * 0.607, imageWidth * 0.4);
            mainCtx.restore();
        };

        var drawTickmarksImage = function(ctx, freeAreaAngle, offset, minVal, maxVal, angleStep, tickLabelPeriod, scaleDividerPower, drawTicks, drawTickLabels) {
            var MEDIUM_STROKE = Math.max(imageWidth * 0.012, 2);
            var THIN_STROKE = Math.max(imageWidth * 0.007, 1.5);
            var TEXT_DISTANCE = imageWidth * 0.13;
            var MED_LENGTH = imageWidth * 0.05;
            var MAX_LENGTH = imageWidth * 0.07;
            var RADIUS = imageWidth * 0.4;
            var counter = 0;
            var tickCounter = 0;
            var sinValue = 0;
            var cosValue = 0;
            var alpha;          // angle for tickmarks
            var valueCounter;   // value for tickmarks

            var ALPHA_START = -offset - (freeAreaAngle /2);

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = stdFont;
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            for (alpha = ALPHA_START, valueCounter = 0; valueCounter <= 10; alpha -= angleStep * 0.1, valueCounter += 0.1) {
                sinValue = Math.sin(alpha);
                cosValue = Math.cos(alpha);

                // tickmark every 2 units
                if (counter % 2 === 0) {
                    ctx.lineWidth = THIN_STROKE;
                    // Draw ticks
                    ctx.beginPath();
                    ctx.moveTo(centerX + (RADIUS - MED_LENGTH) * sinValue, centerY + (RADIUS - MED_LENGTH) * cosValue);
                    ctx.lineTo(centerX + RADIUS * sinValue, centerY + RADIUS * cosValue);
                    ctx.closePath();
                    ctx.stroke();
                }

                // Different tickmark every 10 units
                if (counter === 10 || counter === 0) {
                    ctx.lineWidth = MEDIUM_STROKE;

                    // if gauge is full circle, avoid painting maxValue over minValue
                    if (freeAreaAngle === 0) {
                        if (Math.round(valueCounter) != maxValue) {
                            ctx.fillText(Math.round(valueCounter).toString(), centerX + (RADIUS - TEXT_DISTANCE) * sinValue, centerY + (RADIUS - TEXT_DISTANCE) * cosValue);
                        }
                    }
                    counter = 0;
                    tickCounter++;

                    // Draw ticks
                    ctx.beginPath();
                    ctx.moveTo(centerX + (RADIUS - MAX_LENGTH) * sinValue, centerY + (RADIUS - MAX_LENGTH) * cosValue);
                    ctx.lineTo(centerX + RADIUS * sinValue, centerY + RADIUS * cosValue);
                    ctx.closePath();
                    ctx.stroke();
                }
                counter++;
            }
            ctx.restore();
        };

        var draw100ftPointer = function(ctx, shadow) {
            var grad;
            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            } else {
                grad = ctx.createLinearGradient(0, imageHeight * 0.168224, 0, imageHeight * 0.626168);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.31, '#ffffff');
                grad.addColorStop(0.3101, '#ffffff');
                grad.addColorStop(0.32, '#202020');
                grad.addColorStop(1, '#202020');
                ctx.fillStyle = grad;
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.514018, imageHeight * 0.471962, imageWidth * 0.509345, imageHeight * 0.467289, imageWidth * 0.509345, imageHeight * 0.467289);
            ctx.lineTo(imageWidth * 0.509345, imageHeight * 0.200934);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.168224);
            ctx.lineTo(imageWidth * 0.490654, imageHeight * 0.200934);
            ctx.lineTo(imageWidth * 0.490654, imageHeight * 0.467289);
            ctx.bezierCurveTo(imageWidth * 0.490654, imageHeight * 0.467289, imageWidth * 0.481308, imageHeight * 0.471962, imageWidth * 0.481308, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageHeight * 0.481308, imageWidth * 0.467289, imageHeight * 0.490654, imageWidth * 0.467289, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.514018, imageWidth * 0.476635, imageHeight * 0.528037, imageWidth * 0.490654, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.490654, imageHeight * 0.532710, imageWidth * 0.490654, imageHeight * 0.579439, imageWidth * 0.490654, imageHeight * 0.588785);
            ctx.bezierCurveTo(imageWidth * 0.485981, imageHeight * 0.593457, imageWidth * 0.481308, imageHeight * 0.598130, imageWidth * 0.481308, imageHeight * 0.607476);
            ctx.bezierCurveTo(imageWidth * 0.481308, imageHeight * 0.616822, imageWidth * 0.490654, imageHeight * 0.626168, imageWidth * 0.5, imageHeight * 0.626168);
            ctx.bezierCurveTo(imageWidth * 0.509345, imageHeight * 0.626168, imageWidth * 0.518691, imageHeight * 0.616822, imageWidth * 0.518691, imageHeight * 0.607476);
            ctx.bezierCurveTo(imageWidth * 0.518691, imageHeight * 0.598130, imageWidth * 0.514018, imageHeight * 0.593457, imageWidth * 0.504672, imageHeight * 0.588785);
            ctx.bezierCurveTo(imageWidth * 0.504672, imageHeight * 0.579439, imageWidth * 0.504672, imageHeight * 0.532710, imageWidth * 0.509345, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.523364, imageHeight * 0.528037, imageWidth * 0.532710, imageHeight * 0.514018, imageWidth * 0.532710, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.490654, imageWidth * 0.528037, imageHeight * 0.481308, imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.closePath();
            ctx.fill();
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
       };

        var draw1000ftPointer = function(ctx, shadow) {
            var grad;
            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            } else {
                grad = ctx.createLinearGradient(0, imageHeight * 0.401869, 0, imageHeight * 0.616822);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.51, '#ffffff');
                grad.addColorStop(0.52, '#ffffff');
                grad.addColorStop(0.5201, '#202020');
                grad.addColorStop(0.53, '#202020');
                grad.addColorStop(1, '#202020');
                ctx.fillStyle = grad;
            }
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.514018, imageHeight * 0.462616, imageWidth * 0.528037, imageHeight * 0.401869, imageWidth * 0.528037, imageHeight * 0.401869);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.331775);
            ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.401869);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageHeight * 0.401869, imageWidth * 0.485981, imageHeight * 0.462616, imageWidth * 0.481308, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageHeight * 0.481308, imageWidth * 0.467289, imageHeight * 0.490654, imageWidth * 0.467289, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.514018, imageWidth * 0.476635, imageHeight * 0.528037, imageWidth * 0.490654, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.490654, imageHeight * 0.532710, imageWidth * 0.462616, imageHeight * 0.574766, imageWidth * 0.462616, imageHeight * 0.593457);
            ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.616822, imageWidth * 0.5, imageHeight * 0.612149, imageWidth * 0.5, imageHeight * 0.612149);
            ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.612149, imageWidth * 0.532710, imageHeight * 0.616822, imageWidth * 0.537383, imageHeight * 0.593457);
            ctx.bezierCurveTo(imageWidth * 0.537383, imageHeight * 0.574766, imageWidth * 0.509345, imageHeight * 0.532710, imageWidth * 0.509345, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.523364, imageHeight * 0.528037, imageWidth * 0.532710, imageHeight * 0.514018, imageWidth * 0.532710, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.490654, imageWidth * 0.528037, imageHeight * 0.481308, imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.closePath();
            ctx.fill();
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
            ctx.restore();
        };

        var draw10000ftPointer = function(ctx, shadow) {
            if (shadow) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            } else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.beginPath()
            ctx.moveTo(imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.514018, imageHeight * 0.471962, imageWidth * 0.514018, imageHeight * 0.467289, imageWidth * 0.514018, imageHeight * 0.467289);
            ctx.lineTo(imageWidth * 0.514018, imageHeight * 0.317757);
            ctx.lineTo(imageWidth * 0.504672, imageHeight * 0.303738);
            ctx.lineTo(imageWidth * 0.504672, imageHeight * 0.182242);
            ctx.lineTo(imageWidth * 0.532710, imageHeight * 0.116822);
            ctx.lineTo(imageWidth * 0.462616, imageHeight * 0.116822);
            ctx.lineTo(imageWidth * 0.495327, imageHeight * 0.182242);
            ctx.lineTo(imageWidth * 0.495327, imageHeight * 0.299065);
            ctx.lineTo(imageWidth * 0.485981, imageHeight * 0.317757);
            ctx.lineTo(imageWidth * 0.485981, imageHeight * 0.467289);
            ctx.bezierCurveTo(imageWidth * 0.485981, imageHeight * 0.467289, imageWidth * 0.485981, imageHeight * 0.471962, imageWidth * 0.481308, imageHeight * 0.471962);
            ctx.bezierCurveTo(imageWidth * 0.471962, imageHeight * 0.481308, imageWidth * 0.467289, imageHeight * 0.490654, imageWidth * 0.467289, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.467289, imageHeight * 0.518691, imageWidth * 0.481308, imageHeight * 0.532710, imageWidth * 0.5, imageHeight * 0.532710);
            ctx.bezierCurveTo(imageWidth * 0.518691, imageHeight * 0.532710, imageWidth * 0.532710, imageHeight * 0.518691, imageWidth * 0.532710, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.532710, imageHeight * 0.490654, imageWidth * 0.528037, imageHeight * 0.481308, imageWidth * 0.518691, imageHeight * 0.471962);
            ctx.closePath();
            ctx.fill();
            if (shadow) {
                // Apply a blur
                blur(ctx, imageWidth, imageHeight, Math.floor(imageWidth * 0.006));
            }
        };

        function calcAngleStep() {
            angleStep100ft = (2 * Math.PI) / (maxValue - minValue);
            angleStep1000ft = angleStep100ft / 10;
            angleStep10000ft = angleStep1000ft / 10;
        }

        function calcValues() {
            value100 = (value % 1000) / 100;
            value1000 = (value % 10000) / 100;
            value10000 = (value % 100000) / 100;
        }

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function(parameters) {
            parameters = parameters || {};
            var drawFrame = (undefined === parameters.frame ? false : parameters.frame);
            var drawBackground = (undefined === parameters.background ? false : parameters.background);
            var drawPointers = (undefined === parameters.pointers ? false : parameters.pointers);
            var drawForeground = (undefined === parameters.foreground ? false : parameters.foreground);

            initialized = true;

            calcAngleStep();

            // Create frame in frame buffer (backgroundBuffer)
            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            if (drawBackground && backgroundVisible) {
                // Create background in background buffer (backgroundBuffer)
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

                // Create custom layer in background buffer (backgroundBuffer)
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);

                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, 0, TICKMARK_OFFSET, 0, 10, angleStep100ft, tickLabelPeriod, 0, true, true, null);
            }

            // Create lcd background if selected in background buffer (backgroundBuffer)
            if (drawBackground && lcdVisible) {
                lcdBuffer = createLcdBackgroundImage(imageWidth * 0.4, imageHeight * 0.09, lcdColor);
                backgroundContext.drawImage(lcdBuffer, (imageWidth - (imageWidth * 0.4)) / 2, imageHeight * 0.56);
            }

            if (drawPointers) {
                // Create 100ft pointer in buffer
                draw100ftPointer(pointer100Context, false);
                // Create 100ft pointer shadow in buffer
                draw100ftPointer(pointer100ShadowContext, true);
                // Create 1000ft pointer in buffer
                draw1000ftPointer(pointer1000Context, false);
                // Create 1000ft pointer shadow in buffer
                draw1000ftPointer(pointer1000ShadowContext, true);
                // Create 10000ft pointer in buffer
                draw10000ftPointer(pointer10000Context, false);
                // Create 10000ft pointer shadow in buffer
                draw10000ftPointer(pointer10000ShadowContext, true);
            }

            if (drawForeground && foregroundVisible) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle);
            }
        };

        var resetBuffers = function(buffers) {
            buffers = buffers || {};
            var resetFrame = (undefined === buffers.frame ? false : buffers.frame);
            var resetBackground = (undefined === buffers.background ? false : buffers.background);
            var resetPointers = (undefined === buffers.pointers ? false : buffers.pointers);
            var resetForeground = (undefined === buffers.foreground ? false : buffers.foreground);

            if (resetFrame) {
                frameBuffer.width = size;
                frameBuffer.height = size;
                frameContext = frameBuffer.getContext('2d');
            }

            if (resetBackground) {
                backgroundBuffer.width = size;
                backgroundBuffer.height = size;
                backgroundContext = backgroundBuffer.getContext('2d');
            }

            if (resetPointers) {
                pointer100ftBuffer.width = size;
                pointer100ftBuffer.height = size;
                pointer100ftContext = pointer100ftBuffer.getContext('2d');

                pointer100ftShadowBuffer.width = size;
                pointer100ftShadowBuffer.height = size;
                pointer100ftShadowContext = pointer100ftShadowBuffer.getContext('2d');

                pointer1000ftBuffer.width = size;
                pointer1000ftBuffer.height = size;
                pointer1000ftContext = pointer1000ftBuffer.getContext('2d');

                pointer1000ftShadowBuffer.width = size;
                pointer1000ftShadowBuffer.height = size;
                pointer1000ftShadowContext = pointer1000ftShadowBuffer.getContext('2d');

                pointer10000ftBuffer.width = size;
                pointer10000ftBuffer.height = size;
                pointer10000ftContext = pointer10000ftBuffer.getContext('2d');

                pointer10000ftShadowBuffer.width = size;
                pointer10000ftShadowBuffer.height = size;
                pointer10000ftShadowContext = pointer10000ftShadowBuffer.getContext('2d');

                pointerRotBuffer.width = size;
                pointerRotBuffer.height = size;
                pointerRotContext = pointerRotBuffer.getContext('2d');
            }

            if (resetForeground) {
                foregroundBuffer.width = size;
                foregroundBuffer.height = size;
                foregroundContext = foregroundBuffer.getContext('2d');
            }
        };

        //************************************ Public methods **************************************
        this.setValue = function(newValue) {
            value = newValue;
            this.repaint();
        };

        this.getValue = function() {
            return value;
        };

        this.setValueAnimated = function(newValue) {
            var targetValue = (newValue < minValue ? minValue : newValue);
            if (value !== targetValue) {
                if (undefined !==  tween) {
                    if (tween.playing) {
                        tween.stop();
                    }
                }
                // Allow 5 secs per 10,000ft
                var time = Math.max(Math.abs(value - targetValue) / 10000 * 5, 1);
                tween = new Tween({}, '', Tween.regularEaseInOut, value, targetValue, time);
                //tween = new Tween(new Object(), '', Tween.strongEaseInOut, value, targetValue, 1);

                var gauge = this;

                tween.onMotionChanged = function(event) {
                    value = event.target._pos;

                    gauge.repaint();
                };

                tween.start();
            }
        };

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({frame: true});
            frameDesign = newFrameDesign;
            init({frame: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers({
                background: true,
                pointer: true       // type2 & 13 depend on background
                });
            backgroundColor = newBackgroundColor;
            init({
                background: true,   // type2 & 13 depend on background
                pointer: true
                });
            this.repaint();
        };

        this.setForegroundType = function(newForegroundType) {
            resetBuffers({foreground: true});
            foregroundType = newForegroundType;
            init({foreground: true});
            this.repaint();
        };

        this.setLcdColor = function(newLcdColor) {
            lcdColor = newLcdColor;
            init({background: true});
            this.repaint();
        };

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointers: true,
                      foreground: true});
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            if (frameVisible) {
                mainCtx.drawImage(frameBuffer, 0, 0);
            }

            // Draw buffered image to visible canvas
            mainCtx.drawImage(backgroundBuffer, 0, 0);

            // Draw lcd display
            if (lcdVisible) {
                drawLcdText(value);
            }

            // re-calculate the spearate pointer values
            calcValues();

            // have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006 * 0.5;

            //Draw 10000ft pointer shadow
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate((value10000 - minValue) * angleStep10000ft);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointer10000ShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            //Draw 10000ft pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate((value10000 - minValue) * angleStep10000ft);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointer10000Buffer, 0, 0);
            mainCtx.restore();

            //Draw 1000ft pointer shadow
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate((value1000 - minValue) * angleStep1000ft);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointer1000ShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            shadowOffset = imageWidth * 0.006 * 0.75;

            //Draw 1000ft pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate((value1000 - minValue) * angleStep1000ft);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointer1000Buffer, 0, 0);
            mainCtx.restore();

            shadowOffset = imageWidth * 0.006;

            //Draw 100ft pointer shadow
            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate((value100 - minValue) * angleStep100ft);
            pointerRotContext.translate(-centerX, -centerY);
            pointerRotContext.drawImage(pointer100ShadowBuffer, 0, 0);
            pointerRotContext.restore();
            mainCtx.drawImage(pointerRotBuffer, 0, 0, imageWidth, imageHeight, shadowOffset, shadowOffset, imageWidth + shadowOffset, imageHeight + shadowOffset);

            //Draw 100ft pointer
            mainCtx.save();
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate((value100 - minValue) * angleStep100ft);
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointer100Buffer, 0, 0);
            mainCtx.restore();

            //Draw the foregound
            if (foregroundVisible) {
                mainCtx.drawImage(foregroundBuffer, 0, 0);
            }

        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var trafficlight = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 98 : parameters.width);
        var height = (undefined === parameters.height ? 278 : parameters.height);

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Get the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;

        var prefHeight = width < (height * 0.352517) ? (width * 2.836734) : height;
        var imageWidth = prefHeight * 0.352517;
        var imageHeight = prefHeight;

        var redOn = false;
        var yellowOn = false;
        var greenOn = false;

        var initialized = false;

        var housingBuffer = doc.createElement('canvas');
        housingBuffer.width = imageWidth;
        housingBuffer.height = imageHeight;
        var housingCtx = housingBuffer.getContext('2d');

        var lightGreenBuffer = doc.createElement('canvas');
        lightGreenBuffer.width = imageWidth;
        lightGreenBuffer.height = imageHeight;
        var lightGreenCtx = lightGreenBuffer.getContext('2d');

        var greenOnBuffer = doc.createElement('canvas');
        greenOnBuffer.width = imageWidth;
        greenOnBuffer.height = imageHeight;
        var greenOnCtx = greenOnBuffer.getContext('2d');

        var greenOffBuffer = doc.createElement('canvas');
        greenOffBuffer.width = imageWidth;
        greenOffBuffer.height = imageHeight;
        var greenOffCtx = greenOffBuffer.getContext('2d');

        var lightYellowBuffer = doc.createElement('canvas');
        lightYellowBuffer.width = imageWidth;
        lightYellowBuffer.height = imageHeight;
        var lightYellowCtx = lightYellowBuffer.getContext('2d');

        var yellowOnBuffer = doc.createElement('canvas');
        yellowOnBuffer.width = imageWidth;
        yellowOnBuffer.height = imageHeight;
        var yellowOnCtx = yellowOnBuffer.getContext('2d');

        var yellowOffBuffer = doc.createElement('canvas');
        yellowOffBuffer.width = imageWidth;
        yellowOffBuffer.height = imageHeight;
        var yellowOffCtx = yellowOffBuffer.getContext('2d');

        var lightRedBuffer = doc.createElement('canvas');
        lightRedBuffer.width = imageWidth;
        lightRedBuffer.height = imageHeight;
        var lightRedCtx = lightRedBuffer.getContext('2d');

        var redOnBuffer = doc.createElement('canvas');
        redOnBuffer.width = imageWidth;
        redOnBuffer.height = imageHeight;
        var redOnCtx = redOnBuffer.getContext('2d');

        var redOffBuffer = doc.createElement('canvas');
        redOffBuffer.width = imageWidth;
        redOffBuffer.height = imageHeight;
        var redOffCtx = redOffBuffer.getContext('2d');

        var drawHousing = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.107142 * imageWidth, 0);
            ctx.lineTo(imageWidth - 0.107142 * imageWidth, 0);
            ctx.quadraticCurveTo(imageWidth, 0, imageWidth, 0.107142 * imageWidth);
            ctx.lineTo(imageWidth, imageHeight - 0.107142 * imageWidth);
            ctx.quadraticCurveTo(imageWidth, imageHeight, imageWidth - 0.107142 * imageWidth, imageHeight);
            ctx.lineTo(0.107142 * imageWidth, imageHeight);
            ctx.quadraticCurveTo(0, imageHeight, 0, imageHeight - 0.107142 * imageWidth);
            ctx.lineTo(0, 0.107142 * imageWidth);
            ctx.quadraticCurveTo(0, 0, 0.107142 * imageWidth, imageHeight);
            ctx.closePath();
            var housingFill = ctx.createLinearGradient(0.040816 * imageWidth, 0.007194 * imageHeight, 0.952101 * imageWidth, 0.995882 * imageHeight);
            housingFill.addColorStop(0, 'rgb(152, 152, 154)');
            housingFill.addColorStop(0.01, 'rgb(152, 152, 154)');
            housingFill.addColorStop(0.09, '#333333');
            housingFill.addColorStop(0.24, 'rgb(152, 152, 154)');
            housingFill.addColorStop(0.55, 'rgb(31, 31, 31)');
            housingFill.addColorStop(0.78, '#363636');
            housingFill.addColorStop(0.98, '#000000');
            housingFill.addColorStop(1, '#000000');
            ctx.fillStyle = housingFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.030612 * imageWidth + 0.084183 * imageWidth, 0.010791 * imageHeight);
            ctx.lineTo(0.030612 * imageWidth + 0.938775 * imageWidth - 0.084183 * imageWidth, 0.010791 * imageHeight);
            ctx.quadraticCurveTo(0.030612 * imageWidth + 0.938775 * imageWidth, 0.010791 * imageHeight, 0.030612 * imageWidth + 0.938775 * imageWidth, 0.010791 * imageHeight + 0.084183 * imageWidth);
            ctx.lineTo(0.030612 * imageWidth + 0.938775 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight - 0.084183 * imageWidth);
            ctx.quadraticCurveTo(0.030612 * imageWidth + 0.938775 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight, 0.030612 * imageWidth + 0.938775 * imageWidth - 0.084183 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight);
            ctx.lineTo(0.030612 * imageWidth + 0.084183 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight);
            ctx.quadraticCurveTo(0.030612 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight, 0.030612 * imageWidth, 0.010791 * imageHeight + 0.978417 * imageHeight - 0.084183 * imageWidth);
            ctx.lineTo(0.030612 * imageWidth, 0.010791 * imageHeight + 0.084183 * imageWidth);
            ctx.quadraticCurveTo(0.030612 * imageWidth, 0.010791 * imageHeight, 0.030612 * imageWidth + 0.084183 * imageWidth, 0.010791 * imageHeight);
            ctx.closePath();
            var housingFrontFill = ctx.createLinearGradient(-0.132653 * imageWidth, -0.053956 * imageHeight, 2.061408 * imageWidth, 0.667293 * imageHeight);
            housingFrontFill.addColorStop(0, '#000000');
            housingFrontFill.addColorStop(0.01, '#000000');
            housingFrontFill.addColorStop(0.16, '#373735');
            housingFrontFill.addColorStop(0.31, '#000000');
            housingFrontFill.addColorStop(0.44, '#303030');
            housingFrontFill.addColorStop(0.65, '#000000');
            housingFrontFill.addColorStop(0.87, '#363636');
            housingFrontFill.addColorStop(0.98, '#000000');
            housingFrontFill.addColorStop(1, '#000000');
            ctx.fillStyle = housingFrontFill;
            ctx.fill();
            ctx.restore();

            ctx.restore();
        };

        var drawLightGreen = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.805755 * imageHeight, 0.397959 * imageWidth, 0, 2 * Math.PI, false);
            var lightGreenFrameFill = ctx.createLinearGradient(0, 0.665467 * imageHeight, 0, 0.946043 * imageHeight);
            lightGreenFrameFill.addColorStop(0, '#ffffff');
            lightGreenFrameFill.addColorStop(0.05, 'rgb(204, 204, 204)');
            lightGreenFrameFill.addColorStop(0.1, 'rgb(153, 153, 153)');
            lightGreenFrameFill.addColorStop(0.17, '#666666');
            lightGreenFrameFill.addColorStop(0.27, '#333333');
            lightGreenFrameFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightGreenFrameFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1.083333, 1);
            ctx.beginPath();
            ctx.arc(0.461538 * imageWidth, 0.816546 * imageHeight, 0.367346 * imageWidth, 0, 2 * Math.PI, false);
            var lightGreenInnerFill = ctx.createLinearGradient(0, 0.687050 * imageHeight, 0, 0.946043 * imageHeight);
            lightGreenInnerFill.addColorStop(0, '#000000');
            lightGreenInnerFill.addColorStop(0.35, '#040404');
            lightGreenInnerFill.addColorStop(0.66, '#000000');
            lightGreenInnerFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightGreenInnerFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.809352 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightGreenEffectFill = ctx.createRadialGradient(0.5 * imageWidth, 0.809352 * imageHeight, 0, 0.5 * imageWidth, 0.809352 * imageHeight, 0.362244 * imageWidth);
            lightGreenEffectFill.addColorStop(0, '#000000');
            lightGreenEffectFill.addColorStop(0.88, '#000000');
            lightGreenEffectFill.addColorStop(0.95, 'rgb(94, 94, 94)');
            lightGreenEffectFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightGreenEffectFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.809352 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightGreenInnerShadowFill = ctx.createLinearGradient(0, 0.687050 * imageHeight, 0, 0.917266 * imageHeight);
            lightGreenInnerShadowFill.addColorStop(0, '#000000');
            lightGreenInnerShadowFill.addColorStop(1, 'rgba(1, 1, 1, 0)');
            ctx.fillStyle = lightGreenInnerShadowFill;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var drawGreenOn = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var greenOnFill = ctx.createRadialGradient(0.5 * imageWidth, 0.809352 * imageHeight, 0, 0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth);
            greenOnFill.addColorStop(0, 'rgb(85, 185, 123)');
            greenOnFill.addColorStop(1, 'rgb(0, 31, 0)');
            ctx.fillStyle = greenOnFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0.812949 * imageHeight);
            ctx.bezierCurveTo(0, 0.910071 * imageHeight, 0.224489 * imageWidth, 0.989208 * imageHeight, 0.5 * imageWidth, 0.989208 * imageHeight);
            ctx.bezierCurveTo(0.775510 * imageWidth, 0.989208 * imageHeight, imageWidth, 0.910071 * imageHeight, imageWidth, 0.809352 * imageHeight);
            ctx.bezierCurveTo(0.908163 * imageWidth, 0.751798 * imageHeight, 0.704081 * imageWidth, 0.687050 * imageHeight, 0.5 * imageWidth, 0.687050 * imageHeight);
            ctx.bezierCurveTo(0.285714 * imageWidth, 0.687050 * imageHeight, 0.081632 * imageWidth, 0.751798 * imageHeight, 0, 0.812949 * imageHeight);
            ctx.closePath();
            var greenOnGlowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.809352 * imageHeight, 0, 0.5 * imageWidth, 0.809352 * imageHeight, 0.515306 * imageWidth);
            greenOnGlowFill.addColorStop(0, 'rgb(65, 187, 126)');
            greenOnGlowFill.addColorStop(1, 'rgba(4, 37, 8, 0)');
            ctx.fillStyle = greenOnGlowFill;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var drawGreenOff = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var greenOffFill = ctx.createRadialGradient(0.5 * imageWidth, 0.809352 * imageHeight, 0, 0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth);
            greenOffFill.addColorStop(0, 'rgba(0, 255, 0, 0.25)');
            greenOffFill.addColorStop(1, 'rgba(0, 255, 0, 0.05)');
            ctx.fillStyle = greenOffFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var greenOffInnerShadowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.809352 * imageHeight, 0, 0.5 * imageWidth, 0.809352 * imageHeight, 0.326530 * imageWidth);
            greenOffInnerShadowFill.addColorStop(0, 'rgba(1, 1, 1, 0)');
            greenOffInnerShadowFill.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
            greenOffInnerShadowFill.addColorStop(0.5501, 'rgba(0, 0, 0, 0)');
            greenOffInnerShadowFill.addColorStop(0.78, 'rgba(0, 0, 0, 0.12)');
            greenOffInnerShadowFill.addColorStop(0.79, 'rgba(0, 0, 0, 0.12)');
            greenOffInnerShadowFill.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
            ctx.fillStyle = greenOffInnerShadowFill;
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = ctx.createPattern(hatchBuffer, 'repeat');
            ctx.fill();

            ctx.restore();
        };

        var drawLightYellow = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.496402 * imageHeight, 0.397959 * imageWidth, 0, 2 * Math.PI, false);
            var lightYellowFrameFill = ctx.createLinearGradient(0, 0.356115 * imageHeight, 0, 0.636690 * imageHeight);
            lightYellowFrameFill.addColorStop(0, '#ffffff');
            lightYellowFrameFill.addColorStop(0.05, 'rgb(204, 204, 204)');
            lightYellowFrameFill.addColorStop(0.1, 'rgb(153, 153, 153)');
            lightYellowFrameFill.addColorStop(0.17, '#666666');
            lightYellowFrameFill.addColorStop(0.27, '#333333');
            lightYellowFrameFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightYellowFrameFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1.083333, 1);
            ctx.beginPath();
            ctx.arc(0.461538 * imageWidth, 0.507194 * imageHeight, 0.367346 * imageWidth, 0, 2 * Math.PI, false);
            var lightYellowInnerFill = ctx.createLinearGradient(0, 0.377697 * imageHeight, 0, 0.636690 * imageHeight);
            lightYellowInnerFill.addColorStop(0, '#000000');
            lightYellowInnerFill.addColorStop(0.35, '#040404');
            lightYellowInnerFill.addColorStop(0.66, '#000000');
            lightYellowInnerFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightYellowInnerFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightYellowEffectFill = ctx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageHeight, 0.362244 * imageWidth);
            lightYellowEffectFill.addColorStop(0, '#000000');
            lightYellowEffectFill.addColorStop(0.88, '#000000');
            lightYellowEffectFill.addColorStop(0.95, '#5e5e5e');
            lightYellowEffectFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightYellowEffectFill;
            ctx.fill();
            ctx.restore();

            //lIGHT_YELLOW_4_E_INNER_SHADOW_3_4
            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightYellowInnerShadowFill = ctx.createLinearGradient(0, 0.377697 * imageHeight, 0, 0.607913 * imageHeight);
            lightYellowInnerShadowFill.addColorStop(0, '#000000');
            lightYellowInnerShadowFill.addColorStop(1, 'rgba(1, 1, 1, 0)');
            ctx.fillStyle = lightYellowInnerShadowFill;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var drawYellowOn = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var yellowOnFill = ctx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth);
            yellowOnFill.addColorStop(0, '#fed434');
            yellowOnFill.addColorStop(1, '#82330c');
            ctx.fillStyle = yellowOnFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0.503597 * imageHeight);
            ctx.bezierCurveTo(0, 0.600719 * imageHeight, 0.224489 * imageWidth, 0.679856 * imageHeight, 0.5 * imageWidth, 0.679856 * imageHeight);
            ctx.bezierCurveTo(0.775510 * imageWidth, 0.679856 * imageHeight, imageWidth, 0.600719 * imageHeight, imageWidth, 0.5 * imageHeight);
            ctx.bezierCurveTo(0.908163 * imageWidth, 0.442446 * imageHeight, 0.704081 * imageWidth, 0.377697 * imageHeight, 0.5 * imageWidth, 0.377697 * imageHeight);
            ctx.bezierCurveTo(0.285714 * imageWidth, 0.377697 * imageHeight, 0.081632 * imageWidth, 0.442446 * imageHeight, 0, 0.503597 * imageHeight);
            ctx.closePath();
            var yellowOnGlowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageHeight, 0.515306 * imageWidth);
            yellowOnGlowFill.addColorStop(0, '#fed434');
            yellowOnGlowFill.addColorStop(1, 'rgba(130, 51, 12, 0)');
            ctx.fillStyle = yellowOnGlowFill;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var drawYellowOff = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var yellowOffFill = ctx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth);
            yellowOffFill.addColorStop(0, 'rgba(255, 255, 0, 0.25)');
            yellowOffFill.addColorStop(1, 'rgba(255, 255, 0, 0.05)');
            ctx.fillStyle = yellowOffFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var yellowOffInnerShadowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageHeight, 0.326530 * imageWidth);
            yellowOffInnerShadowFill.addColorStop(0, 'rgba(1, 1, 1, 0)');
            yellowOffInnerShadowFill.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
            yellowOffInnerShadowFill.addColorStop(0.5501, 'rgba(0, 0, 0, 0)');
            yellowOffInnerShadowFill.addColorStop(0.78, 'rgba(0, 0, 0, 0.12)');
            yellowOffInnerShadowFill.addColorStop(0.79, 'rgba(0, 0, 0, 0.13)');
            yellowOffInnerShadowFill.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
            ctx.fillStyle = yellowOffInnerShadowFill;
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = ctx.createPattern(hatchBuffer, 'repeat');
            ctx.fill();

            ctx.restore();
        };

        var drawLightRed = function(ctx) {
            ctx.save();

            //lIGHT_RED_7_E_FRAME_0_1
            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.187050 * imageHeight, 0.397959 * imageWidth, 0, 2 * Math.PI, false);
            var lightRedFrameFill = ctx.createLinearGradient((0.5 * imageWidth), (0.046762 * imageHeight), ((0.500000) * imageWidth), ((0.327338) * imageHeight));
            lightRedFrameFill.addColorStop(0, '#ffffff');
            lightRedFrameFill.addColorStop(0.05, '#cccccc');
            lightRedFrameFill.addColorStop(0.1, '#999999');
            lightRedFrameFill.addColorStop(0.17, '#666666');
            lightRedFrameFill.addColorStop(0.27, '#333333');
            lightRedFrameFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightRedFrameFill;
            ctx.fill();
            ctx.restore();

            //lIGHT_RED_7_E_INNER_CLIP_1_2
            ctx.save();
            ctx.scale(1.083333, 1);
            ctx.beginPath();
            ctx.arc(0.461538 * imageWidth, 0.197841 * imageHeight, 0.367346 * imageWidth, 0, 2 * Math.PI, false);
            var lightRedInnerFill = ctx.createLinearGradient((0.5 * imageWidth), (0.068345 * imageHeight), ((0.500000) * imageWidth), ((0.327338) * imageHeight));
            lightRedInnerFill.addColorStop(0, '#000000');
            lightRedInnerFill.addColorStop(0.35, '#040404');
            lightRedInnerFill.addColorStop(0.66, '#000000');
            lightRedInnerFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightRedInnerFill;
            ctx.fill();
            ctx.restore();

            //lIGHT_RED_7_E_LIGHT_EFFECT_2_3
            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.190647 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightRedEffectFill = ctx.createRadialGradient((0.5) * imageWidth, ((0.190647) * imageHeight), 0, ((0.5) * imageWidth), ((0.190647) * imageHeight), 0.362244 * imageWidth);
            lightRedEffectFill.addColorStop(0, '#000000');
            lightRedEffectFill.addColorStop(0.88, '#000000');
            lightRedEffectFill.addColorStop(0.95, '#5e5e5e');
            lightRedEffectFill.addColorStop(1, '#010101');
            ctx.fillStyle = lightRedEffectFill;
            ctx.fill();
            ctx.restore();

            //lIGHT_RED_7_E_INNER_SHADOW_3_4
            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.190647 * imageHeight, 0.357142 * imageWidth, 0, 2 * Math.PI, false);
            var lightRedInnerShadowFill = ctx.createLinearGradient((0.5 * imageWidth), (0.068345 * imageHeight), ((0.500000) * imageWidth), ((0.298561) * imageHeight));
            lightRedInnerShadowFill.addColorStop(0, '#000000');
            lightRedInnerShadowFill.addColorStop(1, 'rgba(1, 1, 1, 0)');
            ctx.fillStyle = lightRedInnerShadowFill;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var drawRedOn = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var redOnFill = ctx.createRadialGradient(0.5 * imageWidth, 0.190647 * imageHeight, 0, 0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth);
            redOnFill.addColorStop(0, '#ff0000');
            redOnFill.addColorStop(1, '#410004');
            ctx.fillStyle = redOnFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0.194244 * imageHeight);
            ctx.bezierCurveTo(0, 0.291366 * imageHeight, 0.224489 * imageWidth, 0.370503 * imageHeight, 0.5 * imageWidth, 0.370503 * imageHeight);
            ctx.bezierCurveTo(0.775510 * imageWidth, 0.370503 * imageHeight, imageWidth, 0.291366 * imageHeight, imageWidth, 0.190647 * imageHeight);
            ctx.bezierCurveTo(0.908163 * imageWidth, 0.133093 * imageHeight, 0.704081 * imageWidth, 0.068345 * imageHeight, 0.5 * imageWidth, 0.068345 * imageHeight);
            ctx.bezierCurveTo(0.285714 * imageWidth, 0.068345 * imageHeight, 0.081632 * imageWidth, 0.133093 * imageHeight, 0, 0.194244 * imageHeight);
            ctx.closePath();
            var redOnGlowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.190647 * imageHeight, 0, 0.5 * imageWidth, 0.190647 * imageHeight, 0.515306 * imageWidth);
            redOnGlowFill.addColorStop(0, '#ff0000');
            redOnGlowFill.addColorStop(1, 'rgba(118, 5, 1, 0)');
            ctx.fillStyle = redOnGlowFill;
            ctx.fill();
            ctx.restore();

            ctx.restore();
        };

        var drawRedOff = function(ctx) {
            ctx.save();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var redOffFill = ctx.createRadialGradient(0.5 * imageWidth, 0.190647 * imageHeight, 0, 0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth);
            redOffFill.addColorStop(0, 'rgba(255, 0, 0, 0.25)');
            redOffFill.addColorStop(1, 'rgba(255, 0, 0, 0.05)');
            ctx.fillStyle = redOffFill;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.scale(1, 1);
            ctx.beginPath();
            ctx.arc(0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth, 0, 2 * Math.PI, false);
            var redOffInnerShadowFill = ctx.createRadialGradient(0.5 * imageWidth, 0.190647 * imageHeight, 0, 0.5 * imageWidth, 0.190647 * imageHeight, 0.326530 * imageWidth);
            redOffInnerShadowFill.addColorStop(0, 'rgba(1, 1, 1, 0)');
            redOffInnerShadowFill.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
            redOffInnerShadowFill.addColorStop(0.5501, 'rgba(0, 0, 0, 0)');
            redOffInnerShadowFill.addColorStop(0.78, 'rgba(0, 0, 0, 0.12)');
            redOffInnerShadowFill.addColorStop(0.79, 'rgba(0, 0, 0, 0.13)');
            redOffInnerShadowFill.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
            ctx.fillStyle = redOffInnerShadowFill;
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = ctx.createPattern(hatchBuffer, 'repeat');
            ctx.fill();

            ctx.restore();
        };

        var hatchBuffer = drawToBuffer(2, 2, function(ctx) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.lineTo(0, 0, 1, 0);
            ctx.lineTo(0, 1, 0, 1);
            ctx.stroke();
            ctx.restore();
        });

        function drawToBuffer(width, height, drawFunction) {
            var buffer = doc.createElement('canvas');
            buffer.width = width;
            buffer.height = height;
            drawFunction(buffer.getContext('2d'));
            return buffer;
        }

        var init = function() {
            initialized = true;

            drawHousing(housingCtx);
            drawLightGreen(lightGreenCtx);
            drawGreenOn(greenOnCtx);
            drawGreenOff(greenOffCtx);
            drawLightYellow(lightYellowCtx);
            drawYellowOn(yellowOnCtx);
            drawYellowOff(yellowOffCtx);
            drawLightRed(lightRedCtx);
            drawRedOn(redOnCtx);
            drawRedOff(redOffCtx);
        };

        // **************   P U B L I C   M E T H O D S   ********************************
        this.setRedOn = function(on) {
            redOn = on;
            this.repaint();
        };

        this.isRedOn = function() {
            return redOn;
        };

        this.setYellowOn = function(on) {
            yellowOn = on;
            this.repaint();
        };

        this.isYellowOn = function() {
            return yellowOn;
        };

        this.setGreenOn = function(on) {
            greenOn = on;
            this.repaint();
        };

        this.isGreenOn = function() {
            return greenOn;
        };

        this.repaint = function() {
            if (!initialized) {
                init();
            }

            mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // housing
            mainCtx.drawImage(housingBuffer, 0, 0);

            // Green light
            mainCtx.drawImage(lightGreenBuffer, 0, 0);

            if (greenOn) {
                mainCtx.drawImage(greenOnBuffer, 0, 0);
            }

            mainCtx.drawImage(greenOffBuffer, 0, 0);

            // Yellow light
            mainCtx.drawImage(lightYellowBuffer, 0, 0);

            if (yellowOn) {
                mainCtx.drawImage(yellowOnBuffer, 0, 0);
            }

            mainCtx.drawImage(yellowOffBuffer, 0, 0);

            // Red light
            mainCtx.drawImage(lightRedBuffer, 0, 0);

            if (redOn) {
                mainCtx.drawImage(redOnBuffer, 0, 0);
            }

            mainCtx.drawImage(redOffBuffer, 0, 0);
            mainCtx.restore();
        };

        // Visualize the component
        this.repaint();

        return this;
    };

    var lightbulb = function(canvas, parameters) {
        parameters = parameters || {};
        var width = (undefined === parameters.width ? 100 : parameters.width);
        var height = (undefined === parameters.height ? 100 : parameters.height);
        var glowColor = (undefined === parameters.glowColor ? '#ffff00' : parameters.glowColor);

        // Get the canvas context and clear it
        var mainCtx = document.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Get the size
        mainCtx.canvas.width = width;
        mainCtx.canvas.height = height;
        var size = width < height ? width : height;
        var imageWidth = size;
        var imageHeight = size;

        var initialized = false;

        var lightOn = false;
        var alpha = 1;

        function drawToBuffer(width, height, drawFunction) {
            var buffer = doc.createElement('canvas');
            buffer.width = width;
            buffer.height = height;
            drawFunction(buffer.getContext('2d'));
            return buffer;
        }

        var getColorValues = function(color) {
            var colorData;
            var lookupBuffer = drawToBuffer(1, 1, function(ctx) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.rect(0, 0, 1, 1);
                ctx.fill();
            });
            colorData = lookupBuffer.getContext('2d').getImageData(0, 0, 2, 2).data;

            return new Array(colorData[0], colorData[1], colorData[2]);
        };

        var offBuffer = doc.createElement('canvas');
        offBuffer.width = imageWidth;
        offBuffer.height = imageHeight;
        var offCtx = offBuffer.getContext('2d');

        var onBuffer = doc.createElement('canvas');
        onBuffer.width = imageWidth;
        onBuffer.height = imageHeight;
        var onCtx = onBuffer.getContext('2d');

        var bulbBuffer = doc.createElement('canvas');
        bulbBuffer.width = imageWidth;
        bulbBuffer.height = imageHeight;
        var bulbCtx = bulbBuffer.getContext('2d');

        var drawOff = function(ctx) {
            ctx.save();

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.289473 * imageWidth, 0.438596 * imageHeight);
            ctx.bezierCurveTo(0.289473 * imageWidth, 0.561403 * imageHeight, 0.385964 * imageWidth, 0.605263 * imageHeight, 0.385964 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.385964 * imageWidth, 0.745614 * imageHeight, 0.587719 * imageWidth, 0.745614 * imageHeight, 0.587719 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.587719 * imageWidth, 0.605263 * imageHeight, 0.692982 * imageWidth, 0.561403 * imageHeight, 0.692982 * imageWidth, 0.438596 * imageHeight);
            ctx.bezierCurveTo(0.692982 * imageWidth, 0.324561 * imageHeight, 0.605263 * imageWidth, 0.228070 * imageHeight, 0.5 * imageWidth, 0.228070 * imageHeight);
            ctx.bezierCurveTo(0.385964 * imageWidth, 0.228070 * imageHeight, 0.289473 * imageWidth, 0.324561 * imageHeight, 0.289473 * imageWidth, 0.438596 * imageHeight);
            ctx.closePath();
            var glassOffFill = ctx.createLinearGradient(0, 0.289473 * imageHeight, 0, 0.701754 * imageHeight);
            glassOffFill.addColorStop(0, '#eeeeee');
            glassOffFill.addColorStop(0.99, '#999999');
            glassOffFill.addColorStop(1, '#999999');
            ctx.fillStyle = glassOffFill;
            ctx.fill();
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 0.008771 * imageWidth;
            ctx.strokeStyle = '#cccccc';
            ctx.stroke();
            ctx.restore();
            ctx.restore();
        };

        var drawOn = function(ctx) {
            ctx.save();
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.289473 * imageWidth, 0.438596 * imageHeight);
            ctx.bezierCurveTo(0.289473 * imageWidth, 0.561403 * imageHeight, 0.385964 * imageWidth, 0.605263 * imageHeight, 0.385964 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.385964 * imageWidth, 0.745614 * imageHeight, 0.587719 * imageWidth, 0.745614 * imageHeight, 0.587719 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.587719 * imageWidth, 0.605263 * imageHeight, 0.692982 * imageWidth, 0.561403 * imageHeight, 0.692982 * imageWidth, 0.438596 * imageHeight);
            ctx.bezierCurveTo(0.692982 * imageWidth, 0.324561 * imageHeight, 0.605263 * imageWidth, 0.228070 * imageHeight, 0.5 * imageWidth, 0.228070 * imageHeight);
            ctx.bezierCurveTo(0.385964 * imageWidth, 0.228070 * imageHeight, 0.289473 * imageWidth, 0.324561 * imageHeight, 0.289473 * imageWidth, 0.438596 * imageHeight);
            ctx.closePath();

            var glassOnFill = ctx.createLinearGradient(0, 0.289473 * imageHeight, 0, 0.701754 * imageHeight);
            var data = getColorValues(glowColor);
            var red = data[0];
            var green = data[1];
            var blue = data[2];
            var hsl = rgbToHsl(red, green, blue);

            if (red === green && green === blue) {
                glassOnFill.addColorStop(0, 'hsl(0, 60%, 0%)');
                glassOnFill.addColorStop(1, 'hsl(0, 40%, 0%)');
            } else {
                glassOnFill.addColorStop(0, 'hsl(' + hsl[0] * 255 + ', ' + hsl[1] * 100 + '%, 70%)');
                glassOnFill.addColorStop(1, 'hsl(' + hsl[0] * 255 + ', ' + hsl[1] * 100 + '%, 80%)');
            }
            ctx.fillStyle = glassOnFill;

            // sets shadow properties
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 30;
            ctx.shadowColor = glowColor;

            ctx.fill();

            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 0.008771 * imageWidth;
            ctx.strokeStyle = 'rgba(' + red + ', ' + green + ', ' + blue + ', 0.4)';
            ctx.stroke();

            ctx.restore();

            ctx.restore();
        };

        var drawBulb = function(ctx) {
            ctx.save();

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.350877 * imageWidth, 0.333333 * imageHeight);
            ctx.bezierCurveTo(0.350877 * imageWidth, 0.280701 * imageHeight, 0.412280 * imageWidth, 0.236842 * imageHeight, 0.5 * imageWidth, 0.236842 * imageHeight);
            ctx.bezierCurveTo(0.578947 * imageWidth, 0.236842 * imageHeight, 0.640350 * imageWidth, 0.280701 * imageHeight, 0.640350 * imageWidth, 0.333333 * imageHeight);
            ctx.bezierCurveTo(0.640350 * imageWidth, 0.385964 * imageHeight, 0.578947 * imageWidth, 0.429824 * imageHeight, 0.5 * imageWidth, 0.429824 * imageHeight);
            ctx.bezierCurveTo(0.412280 * imageWidth, 0.429824 * imageHeight, 0.350877 * imageWidth, 0.385964 * imageHeight, 0.350877 * imageWidth, 0.333333 * imageHeight);
            ctx.closePath();
            var highlight = ctx.createLinearGradient(0, 0.245614 * imageHeight, 0, 0.429824 * imageHeight);
            highlight.addColorStop(0, '#ffffff');
            highlight.addColorStop(0.99, 'rgba(255, 255, 255, 0)');
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlight;
            ctx.fill();
            ctx.restore();

            //winding
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.377192 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.377192 * imageWidth, 0.745614 * imageHeight, 0.429824 * imageWidth, 0.728070 * imageHeight, 0.491228 * imageWidth, 0.728070 * imageHeight);
            ctx.bezierCurveTo(0.561403 * imageWidth, 0.728070 * imageHeight, 0.605263 * imageWidth, 0.736842 * imageHeight, 0.605263 * imageWidth, 0.736842 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.763157 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.780701 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.798245 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.815789 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.833333 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.850877 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.868421 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.885964 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.894736 * imageHeight);
            ctx.bezierCurveTo(0.605263 * imageWidth, 0.894736 * imageHeight, 0.570175 * imageWidth, 0.956140 * imageHeight, 0.535087 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.526315 * imageWidth, 0.991228 * imageHeight, 0.517543 * imageWidth, imageHeight, 0.5 * imageWidth, imageHeight);
            ctx.bezierCurveTo(0.482456 * imageWidth, imageHeight, 0.473684 * imageWidth, imageHeight, 0.464912 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.421052 * imageWidth, 0.947368 * imageHeight, 0.394736 * imageWidth, 0.903508 * imageHeight, 0.394736 * imageWidth, 0.903508 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.894736 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.885964 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.868421 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.850877 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.833333 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.815789 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.798245 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.789473 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.771929 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.763157 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.745614 * imageHeight);
            ctx.closePath();
            var winding = ctx.createLinearGradient(0.473684 * imageWidth, 0.728070 * imageHeight, 0.484702 * imageWidth, 0.938307 * imageHeight);
            winding.addColorStop(0, '#333333');
            winding.addColorStop(0.04, '#d9dad6');
            winding.addColorStop(0.19, '#e4e5e0');
            winding.addColorStop(0.24, '#979996');
            winding.addColorStop(0.31, '#fbffff');
            winding.addColorStop(0.4, '#818584');
            winding.addColorStop(0.48, '#f5f7f4');
            winding.addColorStop(0.56, '#959794');
            winding.addColorStop(0.64, '#f2f2f0');
            winding.addColorStop(0.7, '#828783');
            winding.addColorStop(0.78, '#fcfcfc');
            winding.addColorStop(1, '#666666');
            ctx.fillStyle = winding;
            ctx.fill();
            ctx.restore();

            // winding
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.377192 * imageWidth, 0.745614 * imageHeight);
            ctx.bezierCurveTo(0.377192 * imageWidth, 0.745614 * imageHeight, 0.429824 * imageWidth, 0.728070 * imageHeight, 0.491228 * imageWidth, 0.728070 * imageHeight);
            ctx.bezierCurveTo(0.561403 * imageWidth, 0.728070 * imageHeight, 0.605263 * imageWidth, 0.736842 * imageHeight, 0.605263 * imageWidth, 0.736842 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.763157 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.780701 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.798245 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.815789 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.833333 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.850877 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.868421 * imageHeight);
            ctx.lineTo(0.596491 * imageWidth, 0.885964 * imageHeight);
            ctx.lineTo(0.605263 * imageWidth, 0.894736 * imageHeight);
            ctx.bezierCurveTo(0.605263 * imageWidth, 0.894736 * imageHeight, 0.570175 * imageWidth, 0.956140 * imageHeight, 0.535087 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.526315 * imageWidth, 0.991228 * imageHeight, 0.517543 * imageWidth, imageHeight, 0.5 * imageWidth, imageHeight);
            ctx.bezierCurveTo(0.482456 * imageWidth, imageHeight, 0.473684 * imageWidth, imageHeight, 0.464912 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.421052 * imageWidth, 0.947368 * imageHeight, 0.394736 * imageWidth, 0.903508 * imageHeight, 0.394736 * imageWidth, 0.903508 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.894736 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.885964 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.868421 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.850877 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.833333 * imageHeight);
            ctx.lineTo(0.385964 * imageWidth, 0.815789 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.798245 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.789473 * imageHeight);
            ctx.lineTo(0.394736 * imageWidth, 0.771929 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.763157 * imageHeight);
            ctx.lineTo(0.377192 * imageWidth, 0.745614 * imageHeight);
            ctx.closePath();
            var winding1 = ctx.createLinearGradient(0.377192 * imageWidth, 0.789473 * imageHeight, 0.605263 * imageWidth, 0.789473 * imageHeight);
            winding1.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            winding1.addColorStop(0.15, 'rgba(0, 0, 0, 0.32)');
            winding1.addColorStop(0.85, 'rgba(0, 0, 0, 0.33)');
            winding1.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = winding1;
            ctx.fill();
            ctx.restore();

            // contact plate
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0.421052 * imageWidth, 0.947368 * imageHeight);
            ctx.bezierCurveTo(0.438596 * imageWidth, 0.956140 * imageHeight, 0.447368 * imageWidth, 0.973684 * imageHeight, 0.464912 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.473684 * imageWidth, imageHeight, 0.482456 * imageWidth, imageHeight, 0.5 * imageWidth, imageHeight);
            ctx.bezierCurveTo(0.517543 * imageWidth, imageHeight, 0.526315 * imageWidth, 0.991228 * imageHeight, 0.535087 * imageWidth, 0.991228 * imageHeight);
            ctx.bezierCurveTo(0.543859 * imageWidth, 0.982456 * imageHeight, 0.561403 * imageWidth, 0.956140 * imageHeight, 0.578947 * imageWidth, 0.947368 * imageHeight);
            ctx.bezierCurveTo(0.552631 * imageWidth, 0.938596 * imageHeight, 0.526315 * imageWidth, 0.938596 * imageHeight, 0.5 * imageWidth, 0.938596 * imageHeight);
            ctx.bezierCurveTo(0.473684 * imageWidth, 0.938596 * imageHeight, 0.447368 * imageWidth, 0.938596 * imageHeight, 0.421052 * imageWidth, 0.947368 * imageHeight);
            ctx.closePath();
            var contactPlate = ctx.createLinearGradient(0, 0.938596 * imageHeight, 0, imageHeight);
            contactPlate.addColorStop(0, '#050a06');
            contactPlate.addColorStop(0.61, '#070602');
            contactPlate.addColorStop(0.71, '#999288');
            contactPlate.addColorStop(0.83, '#010101');
            contactPlate.addColorStop(1, '#000000');
            ctx.fillStyle = contactPlate;
            ctx.fill();
            ctx.restore();
            ctx.restore();
        };

        var clearCanvas = function(ctx) {
            // Store the current transformation matrix
            ctx.save();

            // Use the identity matrix while clearing the canvas
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Restore the transform
            ctx.restore();
        };

        var init = function() {
            initialized = true;
            drawOff(offCtx);
            drawOn(onCtx);
            drawBulb(bulbCtx);
        };

        // **************   P U B L I C   M E T H O D S   ********************************
        this.setOn = function(on) {
            lightOn = on;
            this.repaint();
        };

        this.isOn = function() {
            return lightOn;
        };

        this.setAlpha = function(a) {
            alpha = a;
            this.repaint();
        };

        this.getAlpha = function() {
            return alpha;
        };

        this.setGlowColor = function(color) {
            glowColor = color;
            init();
            this.repaint();
        }

        this.getGlowColor = function() {
            return glowColor;
        }

        // Component visualization
        this.repaint = function() {
            if (!initialized) {
                init();
            }

            clearCanvas(mainCtx);

            mainCtx.save();

            mainCtx.drawImage(offBuffer, 0, 0);

            mainCtx.globalAlpha = alpha;
            if (lightOn) {
                mainCtx.drawImage(onBuffer, 0, 0);
            }
            mainCtx.globalAlpha = 1;
            mainCtx.drawImage(bulbBuffer, 0, 0);
            mainCtx.restore();
        };

        this.repaint();

        return this;
    };

    //************************************   M E M O R I Z E   B U F F E R S   *******************************************
    var radFBuffer = createBuffer(1,1);
    var radBBuffer = createBuffer(1,1);
    var radBColor;
    var radFDesign;
    var linFBuffer = createBuffer(1,1);
    var linBBuffer = createBuffer(1,1);
    var linBColor;
    var linFDesign;
    var radFgBuffer = createBuffer(1,1);
    var radFgStyle;
    var radFgType;
    var radWithKnob;
    var radKnob;
    var radGaugeType;
    var radOrientation;
    var linFgBuffer = createBuffer(1,1);
    var linVertical;

    //************************************  I M A G E   -   F U N C T I O N S  *****************************************

    var drawRoseImage = function(ctx, centerX, centerY, imageWidth, imageHeight, backgroundColor) {
        var fill = true;
        var i;
        var PI_180 = Math.PI / 180;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.fillStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.translate(centerX, centerY);
        // broken ring
        for (i = 0; i < 360; i += 15) {
            fill = !fill;

            ctx.beginPath();
            ctx.arc(0, 0, imageWidth * 0.26, i * PI_180, (i + 15) * PI_180, false);
            ctx.arc(0, 0, imageWidth * 0.23, (i + 15) * PI_180, i * PI_180, true);
            ctx.closePath();
            if (fill) {
                ctx.fill();
            }
            ctx.stroke();
        }

        ctx.translate(-centerX, -centerY);

        var fillColorPath = backgroundColor.symbolColor.getRgbaColor();
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
/*
        // PATH1_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.560747, imageHeight * 0.584112);
        ctx.lineTo(imageWidth * 0.640186, imageHeight * 0.644859);
        ctx.lineTo(imageWidth * 0.584112, imageHeight * 0.560747);
        ctx.lineTo(imageWidth * 0.560747, imageHeight * 0.584112);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH2_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.411214, imageHeight * 0.560747);
        ctx.lineTo(imageWidth * 0.355140, imageHeight * 0.644859);
        ctx.lineTo(imageWidth * 0.439252, imageHeight * 0.588785);
        ctx.lineTo(imageWidth * 0.411214, imageHeight * 0.560747);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH3_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.584112, imageHeight * 0.443925);
        ctx.lineTo(imageWidth * 0.640186, imageHeight * 0.359813);
        ctx.lineTo(imageWidth * 0.560747, imageHeight * 0.420560);
        ctx.lineTo(imageWidth * 0.584112, imageHeight * 0.443925);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH4_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.439252, imageHeight * 0.415887);
        ctx.lineTo(imageWidth * 0.355140, imageHeight * 0.359813);
        ctx.lineTo(imageWidth * 0.415887, imageHeight * 0.439252);
        ctx.lineTo(imageWidth * 0.439252, imageHeight * 0.415887);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH5_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.523364, imageHeight * 0.397196);
        ctx.lineTo(imageWidth * 0.5, imageHeight * 0.196261);
        ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.397196);
        ctx.lineTo(imageWidth * 0.523364, imageHeight * 0.397196);
        ctx.closePath();
        var PATH5_2_GRADIENT = ctx.createLinearGradient(0.476635 * imageWidth, 0, 0.518691 * imageWidth, 0);
        PATH5_2_GRADIENT.addColorStop(0, 'rgb(222, 223, 218)');
        PATH5_2_GRADIENT.addColorStop(0.48, 'rgb(222, 223, 218)');
        PATH5_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
        PATH5_2_GRADIENT.addColorStop(1, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH5_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH6_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.471962, imageHeight * 0.607476);
        ctx.lineTo(imageWidth * 0.5, imageHeight * 0.813084);
        ctx.lineTo(imageWidth * 0.523364, imageHeight * 0.607476);
        ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.607476);
        ctx.closePath();
        var PATH6_2_GRADIENT = ctx.createLinearGradient(0.518691 * imageWidth, 0, (0.518691 + -0.037383) * imageWidth, 0);
        PATH6_2_GRADIENT.addColorStop(0, 'rgb(222, 223, 218)');
        PATH6_2_GRADIENT.addColorStop(0.56, 'rgb(222, 223, 218)');
        PATH6_2_GRADIENT.addColorStop(0.5601, backgroundColor.symbolColor.getRgbaColor());
        PATH6_2_GRADIENT.addColorStop(1, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH6_2_GRADIENT;
        ctx.lineWidth = 1;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.fill();
        ctx.stroke();

        // PATH7_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.602803, imageHeight * 0.528037);
        ctx.lineTo(imageWidth * 0.803738, imageHeight * 0.5);
        ctx.lineTo(imageWidth * 0.602803, imageHeight * 0.476635);
        ctx.lineTo(imageWidth * 0.602803, imageHeight * 0.528037);
        ctx.closePath();
        var PATH7_2_GRADIENT = ctx.createLinearGradient(0, 0.485981 * imageHeight, 0, 0.514018 * imageHeight);
        PATH7_2_GRADIENT.addColorStop(0, 'rgb(222, 223, 218)');
        PATH7_2_GRADIENT.addColorStop(0.48, 'rgb(222, 223, 218)');
        PATH7_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
        PATH7_2_GRADIENT.addColorStop(1, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH7_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH8_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.392523, imageHeight * 0.476635);
        ctx.lineTo(imageWidth * 0.191588, imageHeight * 0.5);
        ctx.lineTo(imageWidth * 0.392523, imageHeight * 0.528037);
        ctx.lineTo(imageWidth * 0.392523, imageHeight * 0.476635);
        ctx.closePath();
        var PATH8_2_GRADIENT = ctx.createLinearGradient(0, 0.528037 * imageHeight, 0, 0.485981 * imageHeight);
        PATH8_2_GRADIENT.addColorStop(0, 'rgb(222, 223, 218)');
        PATH8_2_GRADIENT.addColorStop(0.52, 'rgb(222, 223, 218)');
        PATH8_2_GRADIENT.addColorStop(0.53, backgroundColor.symbolColor.getRgbaColor());
        PATH8_2_GRADIENT.addColorStop(1, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH8_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH9_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.406542, imageHeight * 0.504672);
        ctx.bezierCurveTo(imageWidth * 0.406542, imageHeight * 0.453271, imageWidth * 0.448598, imageHeight * 0.411214, imageWidth * 0.5, imageHeight * 0.411214);
        ctx.bezierCurveTo(imageWidth * 0.546728, imageHeight * 0.411214, imageWidth * 0.588785, imageHeight * 0.453271, imageWidth * 0.588785, imageHeight * 0.504672);
        ctx.bezierCurveTo(imageWidth * 0.588785, imageHeight * 0.551401, imageWidth * 0.546728, imageHeight * 0.593457, imageWidth * 0.5, imageHeight * 0.593457);
        ctx.bezierCurveTo(imageWidth * 0.448598, imageHeight * 0.593457, imageWidth * 0.406542, imageHeight * 0.551401, imageWidth * 0.406542, imageHeight * 0.504672);
        ctx.closePath();
        ctx.moveTo(imageWidth * 0.387850, imageHeight * 0.504672);
        ctx.bezierCurveTo(imageWidth * 0.387850, imageHeight * 0.560747, imageWidth * 0.439252, imageHeight * 0.612149, imageWidth * 0.5, imageHeight * 0.612149);
        ctx.bezierCurveTo(imageWidth * 0.556074, imageHeight * 0.612149, imageWidth * 0.607476, imageHeight * 0.560747, imageWidth * 0.607476, imageHeight * 0.504672);
        ctx.bezierCurveTo(imageWidth * 0.607476, imageHeight * 0.443925, imageWidth * 0.556074, imageHeight * 0.392523, imageWidth * 0.5, imageHeight * 0.392523);
        ctx.bezierCurveTo(imageWidth * 0.439252, imageHeight * 0.392523, imageWidth * 0.387850, imageHeight * 0.443925, imageWidth * 0.387850, imageHeight * 0.504672);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.lineWidth = 1;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
*/
        // Replacement code, not quite the same but much smaller!

        for (i = 0; 360 >= i; i += 90) {
            // Small pointers
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.560747, imageHeight * 0.584112);
            ctx.lineTo(imageWidth * 0.640186, imageHeight * 0.644859);
            ctx.lineTo(imageWidth * 0.584112, imageHeight * 0.560747);
            ctx.lineTo(imageWidth * 0.560747, imageHeight * 0.584112);
            ctx.closePath();
            ctx.fillStyle = fillColorPath;
            ctx.fill();
            ctx.stroke();
            // Large pointers
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.523364, imageHeight * 0.397196);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.196261);
            ctx.lineTo(imageWidth * 0.471962, imageHeight * 0.397196);
            ctx.lineTo(imageWidth * 0.523364, imageHeight * 0.397196);
            ctx.closePath();
            var PATH5_2_GRADIENT = ctx.createLinearGradient(0.476635 * imageWidth, 0, 0.518691 * imageWidth, 0);
            PATH5_2_GRADIENT.addColorStop(0, 'rgb(222, 223, 218)');
            PATH5_2_GRADIENT.addColorStop(0.48, 'rgb(222, 223, 218)');
            PATH5_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
            PATH5_2_GRADIENT.addColorStop(1, backgroundColor.symbolColor.getRgbaColor());
            ctx.fillStyle = PATH5_2_GRADIENT;
            ctx.fill();
            ctx.stroke();
            ctx.translate(centerX, centerY);
            ctx.rotate(i * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
        }

        // Central ring
        ctx.beginPath();
        ctx.translate(centerX, centerY);
        ctx.arc(0, 0, imageWidth * 0.1, 0, Math.PI * 2, false);
        ctx.lineWidth = imageWidth * 0.022;
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.stroke();
        ctx.translate(-centerX, -centerY);

        ctx.restore();

    };

    var drawPointerImage = function(ctx, size, ptrType, ptrColor, lblColor, shadow) {
        ctx.save();
        var grad;

        if (shadow) {
            // Canvas Shadows are only drawn if the shadowBlur and shadowOffset values are non-zero.
            // As we want the shadow to be in the same place as the pointer we cannot use this, so ...
            // The only option is to blur pixel-by-pixel which is expensive.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        }

        switch (ptrType.type) {
            case 'type2':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, size * 0.471962, 0, size * 0.130841);
                    grad.addColorStop(0, lblColor.getRgbaColor());
                    grad.addColorStop(0.36, lblColor.getRgbaColor());
                    grad.addColorStop(0.361, ptrColor.light.getRgbaColor());
                    grad.addColorStop(1, ptrColor.light.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.518691, size * 0.471962);
                ctx.lineTo(size * 0.509345, size * 0.462616);
                ctx.lineTo(size * 0.509345, size * 0.341121);
                ctx.lineTo(size * 0.504672, size * 0.130841);
                ctx.lineTo(size * 0.495327, size * 0.130841);
                ctx.lineTo(size * 0.490654, size * 0.341121);
                ctx.lineTo(size * 0.490654, size * 0.462616);
                ctx.lineTo(size * 0.481308, size * 0.471962);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type3':
                ctx.beginPath();
                ctx.rect(size * 0.495327, size * 0.130841, size * 0.009345, size * 0.373831);
                ctx.closePath();
                if (!shadow) {
                    ctx.fillStyle = ptrColor.light.getRgbaColor();
                }
                ctx.fill();
                break;

            case 'type4':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.467289 * size, 0, 0.528036 * size, 0);
                    grad.addColorStop(0, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(0.51, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(0.52, ptrColor.light.getRgbaColor());
                    grad.addColorStop(1, ptrColor.light.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.126168);
                ctx.lineTo(size * 0.514018, size * 0.135514);
                ctx.lineTo(size * 0.532710, size * 0.5);
                ctx.lineTo(size * 0.523364, size * 0.602803);
                ctx.lineTo(size * 0.476635, size * 0.602803);
                ctx.lineTo(size * 0.467289, size * 0.5);
                ctx.lineTo(size * 0.485981, size * 0.135514);
                ctx.lineTo(size * 0.5, size * 0.126168);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type5':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.471962 * size, 0, 0.528036 * size, 0);
                    grad.addColorStop(0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.495327);
                ctx.lineTo(size * 0.528037, size * 0.495327);
                ctx.lineTo(size * 0.5, size * 0.149532);
                ctx.lineTo(size * 0.471962, size * 0.495327);
                ctx.lineTo(size * 0.5, size * 0.495327);
                ctx.closePath();
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                if (!shadow) {
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.stroke();
                break;

            case 'type6':
                if (!shadow) {
                    ctx.fillStyle = ptrColor.medium.getRgbaColor();
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.481308, size * 0.485981);
                ctx.lineTo(size * 0.481308, size * 0.392523);
                ctx.lineTo(size * 0.485981, size * 0.317757);
                ctx.lineTo(size * 0.495327, size * 0.130841);
                ctx.lineTo(size * 0.504672, size * 0.130841);
                ctx.lineTo(size * 0.514018, size * 0.317757);
                ctx.lineTo(size * 0.518691, size * 0.387850);
                ctx.lineTo(size * 0.518691, size * 0.485981);
                ctx.lineTo(size * 0.504672, size * 0.485981);
                ctx.lineTo(size * 0.504672, size * 0.387850);
                ctx.lineTo(size * 0.5, size * 0.317757);
                ctx.lineTo(size * 0.495327, size * 0.392523);
                ctx.lineTo(size * 0.495327, size * 0.485981);
                ctx.lineTo(size * 0.481308, size * 0.485981);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type7':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.481308 * size, 0, 0.518691 * size, 0);
                    grad.addColorStop(0, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.490654, size * 0.130841);
                ctx.lineTo(size * 0.481308, size * 0.5);
                ctx.lineTo(size * 0.518691, size * 0.5);
                ctx.lineTo(size * 0.504672, size * 0.130841);
                ctx.lineTo(size * 0.490654, size * 0.130841);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type8':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.471962 * size, 0, 0.528036 * size, 0);
                    grad.addColorStop(0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.532710);
                ctx.lineTo(size * 0.532710, size * 0.5);
                ctx.bezierCurveTo(size * 0.532710, size * 0.5, size * 0.509345, size * 0.457943, size * 0.5, size * 0.149532);
                ctx.bezierCurveTo(size * 0.490654, size * 0.457943, size * 0.467289, size * 0.5, size * 0.467289, size * 0.5);
                ctx.lineTo(size * 0.5, size * 0.532710);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'type9':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.471962 * size, 0, 0.528036 * size, 0);
                    grad.addColorStop(0, 'rgb(50, 50, 50)');
                    grad.addColorStop(0.5, '#666666');
                    grad.addColorStop(1, 'rgb(50, 50, 50)');
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = '#2E2E2E';
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.495327, size * 0.233644);
                ctx.lineTo(size * 0.504672, size * 0.233644);
                ctx.lineTo(size * 0.514018, size * 0.439252);
                ctx.lineTo(size * 0.485981, size * 0.439252);
                ctx.lineTo(size * 0.495327, size * 0.233644);
                ctx.closePath();
                ctx.moveTo(size * 0.490654, size * 0.130841);
                ctx.lineTo(size * 0.471962, size * 0.471962);
                ctx.lineTo(size * 0.471962, size * 0.528037);
                ctx.bezierCurveTo(size * 0.471962, size * 0.528037, size * 0.476635, size * 0.602803, size * 0.476635, size * 0.602803);
                ctx.bezierCurveTo(size * 0.476635, size * 0.607476, size * 0.481308, size * 0.607476, size * 0.5, size * 0.607476);
                ctx.bezierCurveTo(size * 0.518691, size * 0.607476, size * 0.523364, size * 0.607476, size * 0.523364, size * 0.602803);
                ctx.bezierCurveTo(size * 0.523364, size * 0.602803, size * 0.528037, size * 0.528037, size * 0.528037, size * 0.528037);
                ctx.lineTo(size * 0.528037, size * 0.471962);
                ctx.lineTo(size * 0.509345, size * 0.130841);
                ctx.lineTo(size * 0.490654, size * 0.130841);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(size * 0.495327, size * 0.219626);
                ctx.lineTo(size * 0.504672, size * 0.219626);
                ctx.lineTo(size * 0.504672, size * 0.135514);
                ctx.lineTo(size * 0.495327, size * 0.135514);
                ctx.lineTo(size * 0.495327, size * 0.219626);
                ctx.closePath();

                if (!shadow) {
                    ctx.fillStyle = ptrColor.medium.getRgbaColor();
                }
                ctx.fill();
                break;

            case 'type10':
                // POINTER_TYPE10
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.149532);
                ctx.bezierCurveTo(size * 0.5, size * 0.149532, size * 0.443925, size * 0.490654, size * 0.443925, size * 0.5);
                ctx.bezierCurveTo(size * 0.443925, size * 0.532710, size * 0.467289, size * 0.556074, size * 0.5, size * 0.556074);
                ctx.bezierCurveTo(size * 0.532710, size * 0.556074, size * 0.556074, size * 0.532710, size * 0.556074, size * 0.5);
                ctx.bezierCurveTo(size * 0.556074, size * 0.490654, size * 0.5, size * 0.149532, size * 0.5, size * 0.149532);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.471962 * size, 0, 0.528036 * size, 0);
                    grad.addColorStop(0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.medium.getRgbaColor();
                }
                ctx.lineWidth = 1;
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                ctx.fill();
                ctx.stroke();
                break;

            case 'type11':
                // POINTER_TYPE11
                ctx.beginPath();
                ctx.moveTo(0.5 * size, 0.168224 * size);
                ctx.lineTo(0.485981 * size, 0.5 * size);
                ctx.bezierCurveTo(0.485981 * size, 0.5 * size, 0.481308 * size, 0.584112 * size, 0.5 * size, 0.584112 * size);
                ctx.bezierCurveTo(0.514018 * size, 0.584112 * size, 0.509345 * size, 0.5 * size, 0.509345 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.168224 * size);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, 0.168224 * size, 0, 0.584112 * size);
                    grad.addColorStop(0, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.dark.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.fill();
                ctx.stroke();
                break;

            case 'type12':
                // POINTER_TYPE12
                ctx.beginPath();
                ctx.moveTo(0.5 * size, 0.168224 * size);
                ctx.lineTo(0.485981 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.504672 * size);
                ctx.lineTo(0.509345 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.168224 * size);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, 0.168224 * size, 0, 0.504672 * size);
                    grad.addColorStop(0, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.dark.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.fill();
                ctx.stroke();
                break;

            case 'type13':
                // POINTER_TYPE13
            case 'type14':
                // POINTER_TYPE14 (same shape as 13)
                ctx.beginPath();
                ctx.moveTo(0.485981 * size, 0.168224 * size);
                ctx.lineTo(0.5 * size, 0.130841 * size);
                ctx.lineTo(0.509345 * size, 0.168224 * size);
                ctx.lineTo(0.509345 * size, 0.509345 * size);
                ctx.lineTo(0.485981 * size, 0.509345 * size);
                ctx.lineTo(0.485981 * size, 0.168224 * size);
                ctx.closePath();
                if (!shadow) {
                    if (ptrType.type === 'type13') {
                        // TYPE13
                        grad = ctx.createLinearGradient(0, 0.5 * size, 0, 0.130841 * size);
                        grad.addColorStop(0, lblColor.getRgbaColor());
                        grad.addColorStop(0.85, lblColor.getRgbaColor());
                        grad.addColorStop(0.85, ptrColor.medium.getRgbaColor());
                        grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                    } else {
                        // TYPE14
                        grad = ctx.createLinearGradient(0.485981* size, 0, 0.509345 * size, 0);
                        grad.addColorStop(0, ptrColor.veryDark.getRgbaColor());
                        grad.addColorStop(0.5, ptrColor.light.getRgbaColor());
                        grad.addColorStop(1, ptrColor.veryDark.getRgbaColor());
                        ctx.fillStyle = grad;
                    }
                }
                ctx.fill();
                break;

            case 'type15':
                // POINTER TYPE15 - Classic with crescent
            case 'type16':
                // POINTER TYPE16 - Classic without crescent
                ctx.beginPath();
                ctx.moveTo(size * 0.509345, size * 0.457943);
                ctx.lineTo(size * 0.5015, size * 0.13);
                ctx.lineTo(size * 0.4985, size * 0.13);
                ctx.lineTo(size * 0.490654, size * 0.457943);
                ctx.bezierCurveTo(size * 0.490654, size * 0.457943, size * 0.490654, size * 0.457943, size * 0.490654, size * 0.457943);
                ctx.bezierCurveTo(size * 0.471962, size * 0.462616, size * 0.457943, size * 0.481308, size * 0.457943, size * 0.5);
                ctx.bezierCurveTo(size * 0.457943, size * 0.518691, size * 0.471962, size * 0.537383, size * 0.490654, size * 0.542056);
                ctx.bezierCurveTo(size * 0.490654, size * 0.542056, size * 0.490654, size * 0.542056, size * 0.490654, size * 0.542056);
                if (ptrType.type === 'type15') {
                    ctx.lineTo(size * 0.490654, size * 0.57);
                    ctx.bezierCurveTo(size * 0.46, size * 0.58, size * 0.46, size * 0.62, size * 0.490654, size * 0.63);
                    ctx.bezierCurveTo(size * 0.47, size * 0.62, size * 0.48, size * 0.59, size * 0.5, size * 0.59);
                    ctx.bezierCurveTo(size * 0.53, size * 0.59, size * 0.52, size * 0.62, size * 0.509345, size * 0.63);
                    ctx.bezierCurveTo(size * 0.54, size * 0.62, size * 0.54, size * 0.58, size * 0.509345, size * 0.57);
                    ctx.lineTo(size * 0.509345, size * 0.57);
                } else {
                    ctx.lineTo(size * 0.490654, size * 0.621495);
                    ctx.lineTo(size * 0.509345, size * 0.621495);
                }
                ctx.lineTo(size * 0.509345, size * 0.542056);
                ctx.bezierCurveTo(size * 0.509345, size * 0.542056, size * 0.509345, size * 0.542056, size * 0.509345, size * 0.542056);
                ctx.bezierCurveTo(size * 0.528037, size * 0.537383, size * 0.542056, size * 0.518691, size * 0.542056, size * 0.5);
                ctx.bezierCurveTo(size * 0.542056, size * 0.481308, size * 0.528037, size * 0.462616, size * 0.509345, size * 0.457943);
                ctx.bezierCurveTo(size * 0.509345, size * 0.457943, size * 0.509345, size * 0.457943, size * 0.509345, size * 0.457943);
                ctx.closePath();
                if (shadow) {
                    ctx.fill();
                } else {
                    if (ptrType.type === 'type15') {
                        grad = ctx.createLinearGradient(0, 0, 0, size * 0.63);
                    } else {
                        grad = ctx.createLinearGradient(0, 0, 0, size * 0.621495);
                    }
                    grad.addColorStop(0, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(0.388888, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.611111, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                    ctx.fill();
                    ctx.stroke();
                }
                if (!shadow) {
                    // Draw the rings
                    ctx.beginPath();
                    var radius = size * 0.065420 / 2;
                    ctx.arc(size * 0.5, size * 0.5, radius, 0, Math.PI * 2);
                    grad = ctx.createLinearGradient(size * 0.5 - radius, size * 0.5 + radius, 0, size * 0.5 + radius);
                    grad.addColorStop(0, '#e6b35c');
                    grad.addColorStop(0.01, '#e6b35c');
                    grad.addColorStop(0.99, '#c48200');
                    grad.addColorStop(1, '#c48200');
                    ctx.fillStyle = grad;
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    radius = size * 0.046728 / 2;
                    ctx.arc(size * 0.5, size * 0.5, radius, 0, Math.PI * 2);
                    grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, radius);
                    grad.addColorStop(0, '#c5c5c5');
                    grad.addColorStop(0.19, '#c5c5c5');
                    grad.addColorStop(0.22, '#000000');
                    grad.addColorStop(0.8, '#000000');
                    grad.addColorStop(0.99, '#707070');
                    grad.addColorStop(1, '#707070');
                    ctx.fillStyle = grad;
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case 'type1':
            default:
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, size * 0.471962, 0, size * 0.130841);
                    grad.addColorStop(0, ptrColor.veryDark.getRgbaColor());
                    grad.addColorStop(0.3, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(0.59, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1, ptrColor.veryDark.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.518691, size * 0.471962);
                ctx.bezierCurveTo(size * 0.514018, size * 0.457943, size * 0.509345, size * 0.415887, size * 0.509345, size * 0.401869);
                ctx.bezierCurveTo(size * 0.504672, size * 0.383177, size * 0.5, size * 0.130841, size * 0.5, size * 0.130841);
                ctx.bezierCurveTo(size * 0.5, size * 0.130841, size * 0.490654, size * 0.383177, size * 0.490654, size * 0.397196);
                ctx.bezierCurveTo(size * 0.490654, size * 0.415887, size * 0.485981, size * 0.457943, size * 0.481308, size * 0.471962);
                ctx.bezierCurveTo(size * 0.471962, size * 0.481308, size * 0.467289, size * 0.490654, size * 0.467289, size * 0.5);
                ctx.bezierCurveTo(size * 0.467289, size * 0.518691, size * 0.481308, size * 0.532710, size * 0.5, size * 0.532710);
                ctx.bezierCurveTo(size * 0.518691, size * 0.532710, size * 0.532710, size * 0.518691, size * 0.532710, size * 0.5);
                ctx.bezierCurveTo(size * 0.532710, size * 0.490654, size * 0.528037, size * 0.481308, size * 0.518691, size * 0.471962);
                ctx.closePath();
                ctx.fill();
                break;
        }
        if (shadow) {
            // Apply the blur
            blur(ctx, size, size, Math.floor(size * 0.006));
        }
        ctx.restore();
    };

    var drawRadialFrameImage = function(ctx, frameDesign, centerX, centerY, imageWidth, imageHeight) {

        if (imageWidth === radFBuffer.width && imageHeight === radFBuffer.height && frameDesign === radFDesign) {
            ctx.drawImage(radFBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        radFDesign = frameDesign;
        radFBuffer.width = imageWidth;
        radFBuffer.height = imageHeight;
        var radFCtx = radFBuffer.getContext('2d');

        // outer gray frame
        radFCtx.fillStyle = '#848484';
        radFCtx.strokeStyle = 'rgba(132, 132, 132, 0.5)';
        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth / 2, 0, Math.PI * 2, true);
        radFCtx.closePath();
        radFCtx.fill();
        radFCtx.stroke();

        var grad;
        var outerX;
        var innerX;
        var fractions;
        var colors;

        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth * 0.990654 / 2, 0, Math.PI * 2, true);
        radFCtx.closePath();

        // main gradient frame
        switch (frameDesign.design) {
            case "metal":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, '#fefefe');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.12, 'rgb(179, 179, 179)');
                grad.addColorStop(1, 'rgb(213, 213, 213)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "brass":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(249, 243, 155)');
                grad.addColorStop(0.05, 'rgb(246, 226, 101)');
                grad.addColorStop(0.10, 'rgb(240, 225, 132)');
                grad.addColorStop(0.50, 'rgb(90, 57, 22)');
                grad.addColorStop(0.90, 'rgb(249, 237, 139)');
                grad.addColorStop(0.95, 'rgb(243, 226, 108)');
                grad.addColorStop(1, 'rgb(202, 182, 113)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "steel":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(231, 237, 237)');
                grad.addColorStop(0.05, 'rgb(189, 199, 198)');
                grad.addColorStop(0.10, 'rgb(192, 201, 200)');
                grad.addColorStop(0.50, 'rgb(23, 31, 33)');
                grad.addColorStop(0.90, 'rgb(196, 205, 204)');
                grad.addColorStop(0.95, 'rgb(194, 204, 203)');
                grad.addColorStop(1, 'rgb(189, 201, 199)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "gold":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(255, 255, 207)');
                grad.addColorStop(0.15, 'rgb(255, 237, 96)');
                grad.addColorStop(0.22, 'rgb(254, 199, 57)');
                grad.addColorStop(0.3, 'rgb(255, 249, 203)');
                grad.addColorStop(0.38, 'rgb(255, 199, 64)');
                grad.addColorStop(0.44, 'rgb(252, 194, 60)');
                grad.addColorStop(0.51, 'rgb(255, 204, 59)');
                grad.addColorStop(0.6, 'rgb(213, 134, 29)');
                grad.addColorStop(0.68, 'rgb(255, 201, 56)');
                grad.addColorStop(0.75, 'rgb(212, 135, 29)');
                grad.addColorStop(1, 'rgb(247, 238, 101)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "anthracite":
                grad = radFCtx.createLinearGradient(0, 0.004672 * imageHeight, 0, 0.995326 * imageHeight);
                grad.addColorStop(0, 'rgb(118, 117, 135)');
                grad.addColorStop(0.06, 'rgb(74, 74, 82)');
                grad.addColorStop(0.12, 'rgb(50, 50, 54)');
                grad.addColorStop(1, 'rgb(79, 79, 87)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "tiltedGray":
                grad = radFCtx.createLinearGradient(0.233644 * imageWidth, 0.084112 * imageHeight, 0.81258 * imageWidth, 0.910919 * imageHeight);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.16, 'rgb(179, 179, 179)');
                grad.addColorStop(0.33, '#ffffff');
                grad.addColorStop(0.55, '#c5c5c5');
                grad.addColorStop(0.79, '#ffffff');
                grad.addColorStop(1, '#666666');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "tiltedBlack":
                grad = radFCtx.createLinearGradient(0.228971 * imageWidth, 0.079439 * imageHeight, 0.802547 * imageWidth, 0.898591 * imageHeight);
                grad.addColorStop(0, '#666666');
                grad.addColorStop(0.21, '#000000');
                grad.addColorStop(0.47, '#666666');
                grad.addColorStop(0.99, '#000000');
                grad.addColorStop(1, '#000000');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "glossyMetal":
                grad = radFCtx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageWidth, 0.5 * imageWidth);
                grad.addColorStop(0, 'rgb(207, 207, 207)');
                grad.addColorStop(0.96, 'rgb(205, 204, 205)');
                grad.addColorStop(1, 'rgb(244, 244, 244)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                radFCtx.beginPath();
                radFCtx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.973962 * imageWidth / 2, 0, Math.PI * 2);
                radFCtx.closePath();
                grad = radFCtx.createLinearGradient(0, imageHeight - 0.971962 * imageHeight, 0, 0.971962 * imageHeight);
                grad.addColorStop(0, 'rgb(249, 249, 249)');
                grad.addColorStop(0.23, 'rgb(200, 195, 191)');
                grad.addColorStop(0.36, '#ffffff');
                grad.addColorStop(0.59, 'rgb(29, 29, 29)');
                grad.addColorStop(0.76, 'rgb(200, 194, 192)');
                grad.addColorStop(1, 'rgb(209, 209, 209)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();

                radFCtx.beginPath();
                radFCtx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.869158 * imageWidth / 2, 0, Math.PI * 2);
                radFCtx.closePath();
                radFCtx.fillStyle = '#f6f6f6';
                radFCtx.fill();

                radFCtx.beginPath();
                radFCtx.arc(0.5 * imageWidth, 0.5 * imageHeight, 0.85 * imageWidth / 2, 0, Math.PI * 2);
                radFCtx.closePath();
                radFCtx.fillStyle = '#333333';
                radFCtx.fill();
                break;

            case "blackMetal":
                fractions = [
                    0,
                    0.125,
                    0.347222,
                    0.5,
                    0.680555,
                    0.875,
                    1
                ];

                colors = [
                    new rgbaColor(254, 254, 254, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(153, 153, 153, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(153, 153, 153, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(254, 254, 254, 1)
                ];

                radFCtx.save();
                radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.990654 / 2, 0, Math.PI * 2, true));
                outerX = imageWidth * 0.495327;
                innerX = imageWidth * 0.420560;
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(radFCtx, centerX, centerY, innerX, outerX);
                // fade outer edge
                radFCtx.strokeStyle = '#848484';
                radFCtx.strokeStyle = 'rgba(132, 132, 132, 0.8)';
                radFCtx.beginPath();
                radFCtx.lineWidth = imageWidth / 90;
                radFCtx.arc(centerX, centerY, imageWidth / 2, 0, Math.PI * 2, true);
                radFCtx.closePath();
                radFCtx.stroke();
                radFCtx.restore();
                break;

            case "shinyMetal":
                fractions = [
                    0,
                    0.125,
                    0.25,
                    0.347222,
                    0.5,
                    0.652777,
                    0.75,
                    0.875,
                    1
                ];

                colors = [
                    new rgbaColor(254, 254, 254, 1),
                    new rgbaColor(210, 210, 210, 1),
                    new rgbaColor(179, 179, 179, 1),
                    new rgbaColor(238, 238, 238, 1),
                    new rgbaColor(160, 160, 160, 1),
                    new rgbaColor(238, 238, 238, 1),
                    new rgbaColor(179, 179, 179, 1),
                    new rgbaColor(210, 210, 210, 1),
                    new rgbaColor(254, 254, 254, 1)
                ];

                radFCtx.save();
                radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.990654 / 2, 0, Math.PI * 2, true));
                outerX = imageWidth * 0.495327;
                innerX = imageWidth * 0.420560;
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(radFCtx, centerX, centerY, innerX, outerX);
                // fade outer edge
                radFCtx.strokeStyle = '#848484';
                radFCtx.strokeStyle = 'rgba(132, 132, 132, 0.8)';
                radFCtx.beginPath();
                radFCtx.lineWidth = imageWidth / 90;
                radFCtx.arc(centerX, centerY, imageWidth / 2, 0, Math.PI * 2, true);
                radFCtx.closePath();
                radFCtx.stroke();
                radFCtx.restore();
                break;

            case "chrome":
                fractions = [
                    0,
                    0.09,
                    0.12,
                    0.16,
                    0.25,
                    0.29,
                    0.33,
                    0.38,
                    0.48,
                    0.52,
                    0.63,
                    0.68,
                    0.8,
                    0.83,
                    0.87,
                    0.97,
                    1
                ];

                colors = [
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(136, 136, 138, 1),
                    new rgbaColor(164, 185, 190, 1),
                    new rgbaColor(158, 179, 182, 1),
                    new rgbaColor(112, 112, 112, 1),
                    new rgbaColor(221, 227, 227, 1),
                    new rgbaColor(155, 176, 179, 1),
                    new rgbaColor(156, 176, 177, 1),
                    new rgbaColor(254, 255, 255, 1),
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(156, 180, 180, 1),
                    new rgbaColor(198, 209, 211, 1),
                    new rgbaColor(246, 248, 247, 1),
                    new rgbaColor(204, 216, 216, 1),
                    new rgbaColor(164, 188, 190, 1),
                    new rgbaColor(255, 255, 255, 1)
                ];

                radFCtx.save();
                radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.990654 / 2, 0, Math.PI * 2, true));
                outerX = imageWidth * 0.495327;
                innerX = imageWidth * 0.420560;
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(radFCtx, centerX, centerY, innerX, outerX);
                // fade outer edge
                radFCtx.strokeStyle = '#848484';
                radFCtx.strokeStyle = 'rgba(132, 132, 132, 0.8)';
                radFCtx.beginPath();
                radFCtx.lineWidth = imageWidth / 90;
                radFCtx.arc(centerX, centerY, imageWidth / 2, 0, Math.PI * 2, true);
                radFCtx.closePath();
                radFCtx.stroke();
                radFCtx.restore();

                break;
        }

        // inner bright frame
        radFCtx.fillStyle = 'rgb(191, 191, 191)';
        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth * 0.841121 / 2, 0, Math.PI * 2, true);
        radFCtx.closePath();
        radFCtx.fill();

        // clip out center so it is transparent if the background is not visible
        radFCtx.globalCompositeOperation = 'destination-out';
        // Background ellipse
        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
        radFCtx.closePath();
        radFCtx.fill();

        ctx.drawImage(radFBuffer, 0, 0);

        return this;
    };

    var drawLinearFrameImage = function(ctx, frameDesign, imageWidth, imageHeight, vertical) {
        ctx.save();

        if (imageWidth === linFBuffer.width && imageHeight === linFBuffer.height && frameDesign === linFDesign) {
            ctx.drawImage(linFBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        linFDesign = frameDesign;
        linFBuffer.width = imageWidth;
        linFBuffer.height = imageHeight;
        var linFCtx = linFBuffer.getContext('2d');

        // Calculate corner radii
        var OUTER_FRAME_CORNER_RADIUS;
        var FRAME_MAIN_CORNER_RADIUS;
        var SUBTRACT_CORNER_RADIUS;
        if (imageWidth >= imageHeight) {
            OUTER_FRAME_CORNER_RADIUS = imageHeight * 0.05;
            FRAME_MAIN_CORNER_RADIUS = OUTER_FRAME_CORNER_RADIUS - 1;
            SUBTRACT_CORNER_RADIUS = imageHeight * 0.028571;
        } else {
            OUTER_FRAME_CORNER_RADIUS = imageWidth * 0.05;
            FRAME_MAIN_CORNER_RADIUS = OUTER_FRAME_CORNER_RADIUS - 1;
            SUBTRACT_CORNER_RADIUS = imageWidth * 0.028571;
       }

        roundedRectangle(linFCtx, 0, 0, imageWidth, imageHeight, OUTER_FRAME_CORNER_RADIUS);
        linFCtx.fillStyle = '#838383';
        linFCtx.fill();

        roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, FRAME_MAIN_CORNER_RADIUS);
        var grad = linFCtx.createLinearGradient(0, 1, 0, imageHeight - 1);
        // main gradient frame
        switch (frameDesign.design) {
            case "metal":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, '#fefefe');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.12, 'rgb(179, 179, 179)');
                grad.addColorStop(1, 'rgb(213, 213, 213)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "brass":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(249, 243, 155)');
                grad.addColorStop(0.05, 'rgb(246, 226, 101)');
                grad.addColorStop(0.10, 'rgb(240, 225, 132)');
                grad.addColorStop(0.50, 'rgb(90, 57, 22)');
                grad.addColorStop(0.90, 'rgb(249, 237, 139)');
                grad.addColorStop(0.95, 'rgb(243, 226, 108)');
                grad.addColorStop(1, 'rgb(202, 182, 113)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "steel":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(231, 237, 237)');
                grad.addColorStop(0.05, 'rgb(189, 199, 198)');
                grad.addColorStop(0.10, 'rgb(192, 201, 200)');
                grad.addColorStop(0.50, 'rgb(23, 31, 33)');
                grad.addColorStop(0.90, 'rgb(196, 205, 204)');
                grad.addColorStop(0.95, 'rgb(194, 204, 203)');
                grad.addColorStop(1, 'rgb(189, 201, 199)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "gold":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672, 0, imageHeight * 0.990654);
                grad.addColorStop(0, 'rgb(255, 255, 207)');
                grad.addColorStop(0.15, 'rgb(255, 237, 96)');
                grad.addColorStop(0.22, 'rgb(254, 199, 57)');
                grad.addColorStop(0.3, 'rgb(255, 249, 203)');
                grad.addColorStop(0.38, 'rgb(255, 199, 64)');
                grad.addColorStop(0.44, 'rgb(252, 194, 60)');
                grad.addColorStop(0.51, 'rgb(255, 204, 59)');
                grad.addColorStop(0.6, 'rgb(213, 134, 29)');
                grad.addColorStop(0.68, 'rgb(255, 201, 56)');
                grad.addColorStop(0.75, 'rgb(212, 135, 29)');
                grad.addColorStop(1, 'rgb(247, 238, 101)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "anthracite":
                grad = linFCtx.createLinearGradient(0, 0.004672 * imageHeight, 0, 0.995326 * imageHeight);
                grad.addColorStop(0, 'rgb(118, 117, 135)');
                grad.addColorStop(0.06, 'rgb(74, 74, 82)');
                grad.addColorStop(0.12, 'rgb(50, 50, 54)');
                grad.addColorStop(1, 'rgb(79, 79, 87)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "tiltedGray":
                grad = linFCtx.createLinearGradient(0.233644 * imageWidth, 0.084112 * imageHeight, 0.81258 * imageWidth, 0.910919 * imageHeight);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.16, 'rgb(179, 179, 179)');
                grad.addColorStop(0.33, '#ffffff');
                grad.addColorStop(0.55, '#c5c5c5');
                grad.addColorStop(0.79, '#ffffff');
                grad.addColorStop(1, '#666666');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "tiltedBlack":
                grad = linFCtx.createLinearGradient(0.228971 * imageWidth, 0.079439 * imageHeight, 0.802547 * imageWidth, 0.898591 * imageHeight);
                grad.addColorStop(0, '#666666');
                grad.addColorStop(0.21, '#000000');
                grad.addColorStop(0.47, '#666666');
                grad.addColorStop(0.99, '#000000');
                grad.addColorStop(1, '#000000');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "glossyMetal":
                // The smaller side is important for the contour gradient
// Java version uses a contour gradient for the outer frame rim
// but this is only 1 pixel wide, so a plain color fill is essentially
// the same.
/*
                var frameMainFractions4 = [
                                            0,
                                            (imageWidth >= imageHeight ? 32 / imageHeight : 32 / imageWidth) * 0.04,
                                            1
                                            ];
                var frameMainColors4 = [
                                        new rgbaColor(244, 244, 244, 1),
                                        new rgbaColor(207, 207, 207, 1),
                                        new rgbaColor(207, 207, 207, 1)
                                        ];
                var frameMainGradient4 = new contourGradient(linFCtx, 0, 0, imageWidth,  imageHeight, frameMainFractions4, frameMainColors4);
                // Outer frame rim
                linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth-2, imageHeight-2, OUTER_FRAME_CORNER_RADIUS));
                frameMainGradient4.paintContext();
*/
                // Outer frame rim
                linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth-2, imageHeight-2, OUTER_FRAME_CORNER_RADIUS));
                linFCtx.fillStyle = '#cfcfcf';
                linFCtx.fill();

                // Main frame
                linFCtx.clip(roundedRectangle(linFCtx, 2, 2, imageWidth - 4, imageHeight - 4, FRAME_MAIN_CORNER_RADIUS));
                grad = linFCtx.createLinearGradient(0, 2, 0, imageHeight - 4);
// The fractions from the Java version of linear gauge
/*
                grad.addColorStop(0, 'rgb(249, 249, 249)');
                grad.addColorStop(0.1, 'rgb(200, 195, 191)');
                grad.addColorStop(0.26, '#ffffff');
                grad.addColorStop(0.73, 'rgb(29, 29, 29)');
                grad.addColorStop(1, 'rgb(209, 209, 209)');
*/
// Modified fractions from the radial gauge - looks better imho
                grad.addColorStop(0, 'rgb(249, 249, 249)');
                grad.addColorStop(0.2, 'rgb(200, 195, 191)');
                grad.addColorStop(0.3, '#ffffff');
                grad.addColorStop(0.6, 'rgb(29, 29, 29)');
                grad.addColorStop(0.8, 'rgb(200, 194, 192)');
                grad.addColorStop(1, 'rgb(209, 209, 209)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();

                // Inner frame bright
                linFCtx.clip(roundedRectangle(linFCtx, 12, 12, imageWidth - 24, imageHeight - 24, SUBTRACT_CORNER_RADIUS));
                linFCtx.fillStyle = '#f6f6f6';
                linFCtx.fill();

                // Inner frame dark
                linFCtx.clip(roundedRectangle(linFCtx, 13, 13, imageWidth - 26, imageHeight - 26, SUBTRACT_CORNER_RADIUS));
                linFCtx.fillStyle = '#333333';
                linFCtx.fill();
                break;

            case "blackMetal":
                fractions = [
                    0,
                    0.125,
                    0.347222,
                    0.5,
                    0.680555,
                    0.875,
                    1
                ];

                colors = [
                    new rgbaColor(254, 254, 254, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(153, 153, 153, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(153, 153, 153, 1),
                    new rgbaColor(0, 0, 0, 1),
                    new rgbaColor(254, 254, 254, 1)
                ];
                innerX = 0;
                outerX = Math.sqrt(imageHeight * imageHeight + imageWidth * imageWidth) / 2;
                // Set the clip
                linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, OUTER_FRAME_CORNER_RADIUS));
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
                break;

            case "shinyMetal":
                fractions = [
                    0,
                    0.125,
                    0.25,
                    0.347222,
                    0.5,
                    0.652777,
                    0.75,
                    0.875,
                    1
                ];

                colors = [
                    new rgbaColor(254, 254, 254, 1),
                    new rgbaColor(210, 210, 210, 1),
                    new rgbaColor(179, 179, 179, 1),
                    new rgbaColor(238, 238, 238, 1),
                    new rgbaColor(160, 160, 160, 1),
                    new rgbaColor(238, 238, 238, 1),
                    new rgbaColor(179, 179, 179, 1),
                    new rgbaColor(210, 210, 210, 1),
                    new rgbaColor(254, 254, 254, 1)
                ];

                innerX = 0;
                outerX = Math.sqrt(imageHeight * imageHeight + imageWidth * imageWidth) / 2;

                // Set the clip
                linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, OUTER_FRAME_CORNER_RADIUS));
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
                break;

            case "chrome":
                fractions = [
                    0,
                    0.09,
                    0.12,
                    0.16,
                    0.25,
                    0.29,
                    0.33,
                    0.38,
                    0.48,
                    0.52,
                    0.63,
                    0.68,
                    0.8,
                    0.83,
                    0.87,
                    0.97,
                    1
                ];

                colors = [
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(136, 136, 138, 1),
                    new rgbaColor(164, 185, 190, 1),
                    new rgbaColor(158, 179, 182, 1),
                    new rgbaColor(112, 112, 112, 1),
                    new rgbaColor(221, 227, 227, 1),
                    new rgbaColor(155, 176, 179, 1),
                    new rgbaColor(156, 176, 177, 1),
                    new rgbaColor(254, 255, 255, 1),
                    new rgbaColor(255, 255, 255, 1),
                    new rgbaColor(156, 180, 180, 1),
                    new rgbaColor(198, 209, 211, 1),
                    new rgbaColor(246, 248, 247, 1),
                    new rgbaColor(204, 216, 216, 1),
                    new rgbaColor(164, 188, 190, 1),
                    new rgbaColor(255, 255, 255, 1)
                ];
                innerX = 0;
                outerX = Math.sqrt(imageHeight * imageHeight + imageWidth * imageWidth) / 2;
                // Set the clip
                linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, OUTER_FRAME_CORNER_RADIUS));
                grad = new conicalGradient(fractions, colors, -Math.PI / 2);
                grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
                break;
        }

        roundedRectangle(linFCtx, 13, 13, imageWidth - 26, imageHeight - 26, SUBTRACT_CORNER_RADIUS - 1);
        linFCtx.fillStyle = 'rgb(192, 192, 192)';
//        linFCtx.fill();

        // clip out the center of the frame for transparent backgrounds
        linFCtx.globalCompositeOperation = 'destination-out';
        roundedRectangle(linFCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4);
        linFCtx.fill();

        ctx.drawImage(linFBuffer, 0, 0);
        ctx.restore();
        return this;
    };

    var drawRadialBackgroundImage = function(ctx, backgroundColor, centerX, centerY, imageWidth, imageHeight) {

        if (imageWidth === radBBuffer.width && imageHeight === radBBuffer.height && backgroundColor === radBColor) {
            ctx.drawImage(radBBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        radBColor = backgroundColor;
        radBBuffer.width = imageWidth;
        radBBuffer.height = imageHeight;
        var radBCtx = radBBuffer.getContext('2d');

        // Background ellipse
        radBCtx.beginPath();
        radBCtx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
        radBCtx.closePath();

        // If the backgroundColor is a texture fill it with the texture instead of the gradient
        if (backgroundColor === steelseries.BackgroundColor.CARBON || backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET ||
            backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL || backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS) {

            if (backgroundColor === steelseries.BackgroundColor.CARBON) {
                radBCtx.fillStyle = radBCtx.createPattern(carbonBuffer, 'repeat');
                radBCtx.fill();
            }

            if (backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
                radBCtx.fillStyle = radBCtx.createPattern(punchedSheetBuffer, 'repeat');
                radBCtx.fill();
            }

            // Add another inner shadow to make the look more realistic
            var backgroundOffsetX = imageWidth * 0.831775 / 2;
            var fadeGradient = radBCtx.createLinearGradient(backgroundOffsetX, 0, imageWidth - backgroundOffsetX, 0);
            fadeGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
            fadeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
            fadeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
            radBCtx.fillStyle = fadeGradient;
            radBCtx.beginPath();
            radBCtx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
            radBCtx.closePath();
            radBCtx.fill();

            if (backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL || backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS) {
                var mono = (backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL ? true : false);
                var textureColor = parseInt(backgroundColor.gradientStop.getHexColor().substr(-6), 16);
                var texture = brushedMetalTexture(textureColor, 5, 0.1, mono, 0.5);
                radBCtx.fillStyle = radBCtx.createPattern(texture.fill(0, 0, imageWidth, imageHeight), 'no-repeat');
                radBCtx.fill();

            }

        } else if (backgroundColor === steelseries.BackgroundColor.STAINLESS || backgroundColor === steelseries.BackgroundColor.TURNED) {
            // Define the fraction of the conical gradient paint
            var fractions= [
                            0,
                            0.03,
                            0.10,
                            0.14,
                            0.24,
                            0.33,
                            0.38,
                            0.5,
                            0.62,
                            0.67,
                            0.76,
                            0.81,
                            0.85,
                            0.97,
                            1 ];

            // Define the colors of the conical gradient paint
            var colors = [
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#B2B2B4'),
                        new rgbaColor('#ACACAE'),
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#6E6E70'),
                        new rgbaColor('#6E6E70'),
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#6E6E70'),
                        new rgbaColor('#6E6E70'),
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#ACACAE'),
                        new rgbaColor('#B2B2B4'),
                        new rgbaColor('#FDFDFD'),
                        new rgbaColor('#FDFDFD')];
            outerX = imageWidth * 0.831775 / 2;
            innerX = 0;
            grad = new conicalGradient(fractions, colors, Math.PI / 1.75);
            grad.fill(radBCtx, centerX, centerY, innerX, outerX);
            radBCtx.closePath();

            if (backgroundColor === steelseries.BackgroundColor.TURNED) {
                var TWO_PI = Math.PI * 2;
                // Define the turning radius
                var radius = imageWidth * 0.831775 / 2;
                var turnRadius = radius * 0.55;
                // Step size proporational to radius
                var stepSize = TWO_PI / 360 * (500 / radius);

                // Save before we start
                radBCtx.save();
                // restrict the turnings to the desired area
                radBCtx.clip(radBCtx.arc(centerX, centerY, radius, 0, TWO_PI));

                // set the style for the turnings
                radBCtx.lineWidth = 0.5;

                var end = TWO_PI - stepSize * 0.3;
                // Step the engine round'n'round
                for (var i = 0 ; i < end; i += stepSize) {
                    // draw a 'turn'
                    radBCtx.strokeStyle = 'rgba(240, 240, 255, 0.25)';
                    radBCtx.beginPath();
                    radBCtx.arc(centerX + turnRadius, centerY, turnRadius, 0, TWO_PI);
                    radBCtx.stroke();
                    // rotate the 'piece'
                    radBCtx.translate(centerX, centerY);
                    radBCtx.rotate(stepSize * 0.3);
                    radBCtx.translate(-centerX, -centerY);
                    // draw a 'turn'
                    radBCtx.strokeStyle = 'rgba(25, 10, 10, 0.1)';
                    radBCtx.beginPath();
                    radBCtx.arc(centerX + turnRadius, centerY, turnRadius, 0, TWO_PI);
                    radBCtx.stroke();
                    radBCtx.translate(centerX, centerY);
                    radBCtx.rotate(-stepSize * 0.3);
                    radBCtx.translate(-centerX, -centerY);

                    // rotate the 'piece'
                    radBCtx.translate(centerX, centerY);
                    radBCtx.rotate(stepSize);
                    radBCtx.translate(-centerX, -centerY);
                }
                // Restore canvas now we are done
                radBCtx.restore();
            }
        } else {
            var grad = radBCtx.createLinearGradient(0, imageWidth * 0.084112, 0, imageHeight * 0.831775);
            grad.addColorStop(0, backgroundColor.gradientStart.getRgbaColor());
            grad.addColorStop(0.4, backgroundColor.gradientFraction.getRgbaColor());
            grad.addColorStop(1, backgroundColor.gradientStop.getRgbaColor());
            radBCtx.fillStyle = grad;
            radBCtx.fill();
        }
        // Inner shadow
        var gradInnerShadow = radBCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, imageWidth * 0.831775 / 2);
        gradInnerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.71, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.86, 'rgba(0, 0, 0, 0.03)');
        gradInnerShadow.addColorStop(0.92, 'rgba(0, 0, 0, 0.07)');
        gradInnerShadow.addColorStop(0.97, 'rgba(0, 0, 0, 0.15)');
        gradInnerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        radBCtx.fillStyle = gradInnerShadow;

        radBCtx.beginPath();
        radBCtx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
        radBCtx.closePath();
        radBCtx.fill();

        ctx.drawImage(radBBuffer, 0, 0);

        return this;
    };

    var drawRadialCustomImage = function(ctx, img, centerX, centerY, imageWidth, imageHeight) {
        if (img !== null && img.height > 0 && img.width > 0) {
            ctx.save();
            // Set the clipping area
            ctx.beginPath();
            ctx.arc(centerX, centerY, imageWidth * 0.831775 / 2, 0, Math.PI * 2, true);
            ctx.clip();
            // Add the image
            var drawWidth = imageWidth * 0.831775;
            var drawHeight = imageHeight * 0.831775;
            var x = (imageWidth - drawWidth) / 2;
            var y = (imageHeight - drawHeight) / 2;
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            ctx.restore();
        }
        return this;
    };

    var drawLinearBackgroundImage = function(ctx, backgroundColor, imageWidth, imageHeight) {
        ctx.save();

        if (imageWidth === linBBuffer.width && imageHeight === linBBuffer.height && backgroundColor === linBColor) {
            ctx.drawImage(linBBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        linBColor = backgroundColor;
        linBBuffer.width = imageWidth;
        linBBuffer.height = imageHeight;
        var linBCtx = linBBuffer.getContext('2d');

        roundedRectangle(linBCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4);

        // If the backgroundColor is a texture fill it with the texture instead of the gradient
        if (backgroundColor === steelseries.BackgroundColor.CARBON || backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET ||
            backgroundColor === steelseries.BackgroundColor.STAINLESS || backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL ||
            backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS || backgroundColor === steelseries.BackgroundColor.TURNED) {
            if (backgroundColor === steelseries.BackgroundColor.CARBON) {
                linBCtx.fillStyle = linBCtx.createPattern(carbonBuffer, 'repeat');
                linBCtx.fill();
            }

            if (backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
                linBCtx.fillStyle = linBCtx.createPattern(punchedSheetBuffer, 'repeat');
                linBCtx.fill();
            }

            if (backgroundColor === steelseries.BackgroundColor.STAINLESS || backgroundColor === steelseries.BackgroundColor.TURNED) {
                // Create a new buffer for the conical image
                var swirlSize = 60;
                var swirlBuffer = createBuffer(swirlSize, swirlSize);
                var swirlCtx = swirlBuffer.getContext('2d');

                swirlCtx.save();
                // Define the fraction of the conical gradient paint
                var fractions= [
                                0,
                                0.03,
                                0.10,
                                0.14,
                                0.24,
                                0.33,
                                0.38,
                                0.5,
                                0.62,
                                0.67,
                                0.76,
                                0.81,
                                0.85,
                                0.97,
                                1 ];

                // Define the colors of the conical gradient paint
                var colors = [
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#B2B2B4'),
                            new rgbaColor('#ACACAE'),
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#6E6E70'),
                            new rgbaColor('#6E6E70'),
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#6E6E70'),
                            new rgbaColor('#6E6E70'),
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#ACACAE'),
                            new rgbaColor('#B2B2B4'),
                            new rgbaColor('#FDFDFD'),
                            new rgbaColor('#FDFDFD')];
                grad = new conicalGradient(fractions, colors, Math.PI / 1.75);
                // Set a clip as we will be drawing outside the required area
                linBCtx.clip(roundedRectangle(linBCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4));
                var radius = Math.sqrt((imageWidth - 28)*(imageWidth - 28) + (imageHeight - 28)*(imageHeight - 28))/2;
                grad.fill(linBCtx, imageWidth/2, imageHeight/2, 0, radius);
                // Add an additional inner shadow to fade out brightness at the top
                var fadeGradient = linBCtx.createLinearGradient(0, 14, 0, imageHeight - 28);
                fadeGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
                fadeGradient.addColorStop(0.1, 'rgba(0, 0, 0, 0.05)');
                fadeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                linBCtx.fillStyle = fadeGradient;
                roundedRectangle(linBCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4);
                linBCtx.fill();
                linBCtx.restore();

                if (backgroundColor === steelseries.BackgroundColor.TURNED) {
                    var TWO_PI = Math.PI * 2;
                    // Define the turning radius
                    var turnRadius = radius * 0.55;
                    var centerX = imageWidth / 2;
                    var centerY = imageHeight / 2;
                    // Step size proporational to radius
                    var stepSize = TWO_PI / 360 * (400 / radius);

                    // Save before we start
                    linBCtx.save();

                    // set the style for the turnings
                    linBCtx.lineWidth = 0.5;

                    var end = TWO_PI - stepSize * 0.3;
                    // Step the engine round'n'round
                    for (var i = 0; i < end; i += stepSize) {
                        // draw a 'turn'
                        linBCtx.strokeStyle = 'rgba(240, 240, 255, 0.25)';
                        linBCtx.beginPath();
                        linBCtx.arc(centerX + turnRadius, centerY, turnRadius, 0, TWO_PI);
                        linBCtx.stroke();
                        // rotate the 'piece'
                        linBCtx.translate(centerX, centerY);
                        linBCtx.rotate(stepSize * 0.3);
                        linBCtx.translate(-centerX, -centerY);
                        // draw a 'turn'
                        linBCtx.strokeStyle = 'rgba(25, 10, 10, 0.1)';
                        linBCtx.beginPath();
                        linBCtx.arc(centerX + turnRadius, centerY, turnRadius, 0, TWO_PI);
                        linBCtx.stroke();
                        linBCtx.translate(centerX, centerY);
                        linBCtx.rotate(-stepSize * 0.3);
                        linBCtx.translate(-centerX, -centerY);

                        // rotate the 'piece'
                        linBCtx.translate(centerX, centerY);
                        linBCtx.rotate(stepSize);
                        linBCtx.translate(-centerX, -centerY);
                    }
                    // Restore canvas now we are done
                    linBCtx.restore();
                }

            }
            // Add an additional inner shadow to make the look more realistic
            var fadeGradient = linBCtx.createLinearGradient(14, 14, imageWidth - 28, imageHeight -28);
            fadeGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
            fadeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
            fadeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
            linBCtx.fillStyle = fadeGradient;
            roundedRectangle(linBCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4);
            linBCtx.fill();

            if (backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL || backgroundColor === steelseries.BackgroundColor.BRUSHED_STAINLESS) {
                var mono = (backgroundColor === steelseries.BackgroundColor.BRUSHED_METAL ? true : false);
                var textureColor = parseInt(backgroundColor.gradientStop.getHexColor().substr(-6), 16);
                var texture = brushedMetalTexture(textureColor, 5, 0.1, mono, 0.5);
                linBCtx.fillStyle = linBCtx.createPattern(texture.fill(0, 0, imageWidth, imageHeight), 'no-repeat');
                linBCtx.fill();
            }

        } else {
            var grad = linBCtx.createLinearGradient(0, 14, 0, imageHeight - 28);
            grad.addColorStop(0, backgroundColor.gradientStart.getRgbaColor());
            grad.addColorStop(0.4, backgroundColor.gradientFraction.getRgbaColor());
            grad.addColorStop(1, backgroundColor.gradientStop.getRgbaColor());
            linBCtx.fillStyle = grad;
            linBCtx.fill();
        }
        // Add a simple inner shadow
        var colors = new Array('rgba(0, 0, 0, 0.3)',
            'rgba(0, 0, 0, 0.15)',
            'rgba(0, 0, 0, 0.07)',
            'rgba(0, 0, 0, 0.03)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0)',
            'rgba(0, 0, 0, 0)');

        for (var i = 0 ; i < 7 ; i++) {
            roundedRectangle(linBCtx, 14 + i, 14 + i, imageWidth - 28 - (2 * i), imageHeight - 28 - (2 * i), 4);
            linBCtx.strokeStyle=colors[i];
            linBCtx.stroke();
        }

        ctx.drawImage(linBBuffer, 0, 0);

        ctx.restore();

        return this;
    };

    var drawRadialForegroundImage = function(ctx, foregroundType, imageWidth, imageHeight, withCenterKnob, knob, style, gaugeType, orientation) {
        if (foregroundType.type === radFgType && imageWidth === radFgBuffer.width && imageHeight === radFgBuffer.height && withCenterKnob === radWithKnob && knob === radKnob && style === radFgStyle && radGaugeType === gaugeType && radOrientation === orientation) {
            ctx.drawImage(radFgBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        radWithKnob = withCenterKnob;
        radKnob = knob;
        radFgStyle = style;
        radFgBuffer.width = imageWidth;
        radFgBuffer.height = imageHeight;
        radGaugeType = gaugeType;
        radOrientation = orientation;
        radFgType = foregroundType.type;
        var radFgCtx = radFgBuffer.getContext('2d');

        var shadowOffset = imageWidth * 0.008;
        // center post
        if (withCenterKnob) {
            if (gaugeType === steelseries.GaugeType.TYPE5) {
                if (steelseries.Orientation.WEST === orientation) {
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, true), imageWidth * 0.687 + shadowOffset, imageHeight * 0.45 + shadowOffset);
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, false), imageWidth * 0.687, imageHeight * 0.45);
                } else {
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, true), imageWidth * 0.45 + shadowOffset, imageHeight * 0.6857 + shadowOffset);
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, false), imageWidth * 0.45, imageHeight * 0.6857);
                }
            } else {
                radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, true), imageWidth * 0.45 + shadowOffset, imageHeight * 0.45 + shadowOffset);
                radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.084112), knob, style, false), imageWidth * 0.45, imageHeight * 0.45);
            }
        }

        // highlight
        var gradHighlight;

        switch (radFgType) {
            case 'type2':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.135514, imageHeight * 0.696261);
                radFgCtx.bezierCurveTo(imageWidth * 0.214953, imageHeight * 0.588785, imageWidth * 0.317757, imageHeight * 0.5, imageWidth * 0.462616, imageHeight * 0.425233);
                radFgCtx.bezierCurveTo(imageWidth * 0.612149, imageHeight * 0.345794, imageWidth * 0.733644, imageHeight * 0.317757, imageWidth * 0.873831, imageHeight * 0.322429);
                radFgCtx.bezierCurveTo(imageWidth * 0.766355, imageHeight * 0.112149, imageWidth * 0.528037, imageHeight * 0.023364, imageWidth * 0.313084, imageHeight * 0.130841);
                radFgCtx.bezierCurveTo(imageWidth * 0.098130, imageHeight * 0.238317, imageWidth * 0.028037, imageHeight * 0.485981, imageWidth * 0.135514, imageHeight * 0.696261);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient(0.313084 * imageWidth, 0.135514 * imageHeight, 0.495528 * imageWidth, 0.493582 * imageHeight);
                gradHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type3':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.084112, imageHeight * 0.509345);
                radFgCtx.bezierCurveTo(imageWidth * 0.210280, imageHeight * 0.556074, imageWidth * 0.462616, imageHeight * 0.560747, imageWidth * 0.5, imageHeight * 0.560747);
                radFgCtx.bezierCurveTo(imageWidth * 0.537383, imageHeight * 0.560747, imageWidth * 0.794392, imageHeight * 0.560747, imageWidth * 0.915887, imageHeight * 0.509345);
                radFgCtx.bezierCurveTo(imageWidth * 0.915887, imageHeight * 0.275700, imageWidth * 0.738317, imageHeight * 0.084112, imageWidth * 0.5, imageHeight * 0.084112);
                radFgCtx.bezierCurveTo(imageWidth * 0.261682, imageHeight * 0.084112, imageWidth * 0.084112, imageHeight * 0.275700, imageWidth * 0.084112, imageHeight * 0.509345);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient(0, 0.093457 * imageHeight, 0, 0.556073 * imageHeight);
                gradHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type4':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.677570, imageHeight * 0.242990);
                radFgCtx.bezierCurveTo(imageWidth * 0.771028, imageHeight * 0.308411, imageWidth * 0.822429, imageHeight * 0.411214, imageWidth * 0.813084, imageHeight * 0.528037);
                radFgCtx.bezierCurveTo(imageWidth * 0.799065, imageHeight * 0.654205, imageWidth * 0.719626, imageHeight * 0.757009, imageWidth * 0.593457, imageHeight * 0.799065);
                radFgCtx.bezierCurveTo(imageWidth * 0.485981, imageHeight * 0.831775, imageWidth * 0.369158, imageHeight * 0.808411, imageWidth * 0.285046, imageHeight * 0.728971);
                radFgCtx.bezierCurveTo(imageWidth * 0.275700, imageHeight * 0.719626, imageWidth * 0.252336, imageHeight * 0.714953, imageWidth * 0.233644, imageHeight * 0.728971);
                radFgCtx.bezierCurveTo(imageWidth * 0.214953, imageHeight * 0.747663, imageWidth * 0.219626, imageHeight * 0.771028, imageWidth * 0.228971, imageHeight * 0.775700);
                radFgCtx.bezierCurveTo(imageWidth * 0.331775, imageHeight * 0.878504, imageWidth * 0.476635, imageHeight * 0.915887, imageWidth * 0.616822, imageHeight * 0.869158);
                radFgCtx.bezierCurveTo(imageWidth * 0.771028, imageHeight * 0.822429, imageWidth * 0.873831, imageHeight * 0.691588, imageWidth * 0.887850, imageHeight * 0.532710);
                radFgCtx.bezierCurveTo(imageWidth * 0.897196, imageHeight * 0.387850, imageWidth * 0.836448, imageHeight * 0.257009, imageWidth * 0.719626, imageHeight * 0.182242);
                radFgCtx.bezierCurveTo(imageWidth * 0.705607, imageHeight * 0.172897, imageWidth * 0.682242, imageHeight * 0.163551, imageWidth * 0.663551, imageHeight * 0.186915);
                radFgCtx.bezierCurveTo(imageWidth * 0.654205, imageHeight * 0.205607, imageWidth * 0.668224, imageHeight * 0.238317, imageWidth * 0.677570, imageHeight * 0.242990);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createRadialGradient((0.5) * imageWidth, ((0.5) * imageHeight), 0, ((0.5) * imageWidth), ((0.5) * imageHeight), 0.387850 * imageWidth);
                gradHighlight.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradHighlight.addColorStop(0.82, 'rgba(255, 255, 255, 0)');
                gradHighlight.addColorStop(0.83, 'rgba(255, 255, 255, 0)');
                gradHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.261682, imageHeight * 0.224299);
                radFgCtx.bezierCurveTo(imageWidth * 0.285046, imageHeight * 0.238317, imageWidth * 0.252336, imageHeight * 0.285046, imageWidth * 0.242990, imageHeight * 0.317757);
                radFgCtx.bezierCurveTo(imageWidth * 0.242990, imageHeight * 0.350467, imageWidth * 0.271028, imageHeight * 0.383177, imageWidth * 0.271028, imageHeight * 0.397196);
                radFgCtx.bezierCurveTo(imageWidth * 0.275700, imageHeight * 0.415887, imageWidth * 0.261682, imageHeight * 0.457943, imageWidth * 0.238317, imageHeight * 0.509345);
                radFgCtx.bezierCurveTo(imageWidth * 0.224299, imageHeight * 0.542056, imageWidth * 0.177570, imageHeight * 0.612149, imageWidth * 0.158878, imageHeight * 0.612149);
                radFgCtx.bezierCurveTo(imageWidth * 0.144859, imageHeight * 0.612149, imageWidth * 0.088785, imageHeight * 0.546728, imageWidth * 0.130841, imageHeight * 0.369158);
                radFgCtx.bezierCurveTo(imageWidth * 0.140186, imageHeight * 0.336448, imageWidth * 0.214953, imageHeight * 0.200934, imageWidth * 0.261682, imageHeight * 0.224299);
                radFgCtx.closePath();
                var gradHighlight2 = radFgCtx.createLinearGradient(0.130841 * imageWidth, 0.369158 * imageHeight, 0.273839 * imageWidth, 0.412877 * imageHeight);
                gradHighlight2.addColorStop(0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight2.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
                radFgCtx.fillStyle = gradHighlight2;
                radFgCtx.fill();
                break;

            case 'type5':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.084112, imageHeight * 0.5);
                radFgCtx.bezierCurveTo(imageWidth * 0.084112, imageHeight * 0.271028, imageWidth * 0.271028, imageHeight * 0.084112, imageWidth * 0.5, imageHeight * 0.084112);
                radFgCtx.bezierCurveTo(imageWidth * 0.700934, imageHeight * 0.084112, imageWidth * 0.864485, imageHeight * 0.224299, imageWidth * 0.906542, imageHeight * 0.411214);
                radFgCtx.bezierCurveTo(imageWidth * 0.911214, imageHeight * 0.439252, imageWidth * 0.911214, imageHeight * 0.518691, imageWidth * 0.845794, imageHeight * 0.537383);
                radFgCtx.bezierCurveTo(imageWidth * 0.794392, imageHeight * 0.546728, imageWidth * 0.551401, imageHeight * 0.411214, imageWidth * 0.392523, imageHeight * 0.457943);
                radFgCtx.bezierCurveTo(imageWidth * 0.168224, imageHeight * 0.509345, imageWidth * 0.135514, imageHeight * 0.775700, imageWidth * 0.093457, imageHeight * 0.593457);
                radFgCtx.bezierCurveTo(imageWidth * 0.088785, imageHeight * 0.560747, imageWidth * 0.084112, imageHeight * 0.532710, imageWidth * 0.084112, imageHeight * 0.5);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient(0, 0.084112 * imageHeight, 0, 0.644859 * imageHeight);
                gradHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type1':
            default:
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.084112, imageHeight * 0.509345);
                radFgCtx.bezierCurveTo(imageWidth * 0.205607, imageHeight * 0.448598, imageWidth * 0.336448, imageHeight * 0.415887, imageWidth * 0.5, imageHeight * 0.415887);
                radFgCtx.bezierCurveTo(imageWidth * 0.672897, imageHeight * 0.415887, imageWidth * 0.789719, imageHeight * 0.443925, imageWidth * 0.915887, imageHeight * 0.509345);
                radFgCtx.bezierCurveTo(imageWidth * 0.915887, imageHeight * 0.275700, imageWidth * 0.738317, imageHeight * 0.084112, imageWidth * 0.5, imageHeight * 0.084112);
                radFgCtx.bezierCurveTo(imageWidth * 0.261682, imageHeight * 0.084112, imageWidth * 0.084112, imageHeight * 0.275700, imageWidth * 0.084112, imageHeight * 0.509345);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient(0, 0.088785 * imageHeight, 0, 0.490654 * imageHeight);
                gradHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
                break;
        }
        radFgCtx.fillStyle = gradHighlight;
        radFgCtx.fill();

        ctx.drawImage(radFgBuffer, 0, 0);

        return this;
    };

    var drawLinearForegroundImage = function(ctx, imageWidth, imageHeight, vertical) {
        ctx.save();

        if (imageWidth === linFgBuffer.width && imageHeight === linFgBuffer.height && linVertical === vertical) {
            ctx.drawImage(linFgBuffer, 0, 0);
            ctx.restore();
            return this;
        }

        // Setup buffer
        linVertical = vertical;
        linFgBuffer.width = imageWidth;
        linFgBuffer.height = imageHeight;
        var linFgCtx = linFgBuffer.getContext('2d');
        var foregroundGradient;

/*        if (vertical) {
            // GLASSEFFECT_VERTICAL
            linFgCtx.save();
            linFgCtx.beginPath();
            linFgCtx.moveTo(18, 18);
            linFgCtx.lineTo(18, imageHeight - 18);
            linFgCtx.bezierCurveTo(18, imageHeight - 18, 27, imageHeight - 27, imageWidth * 0.5, imageHeight - 27);
            linFgCtx.bezierCurveTo(imageWidth - 27, imageHeight - 27, imageWidth - 18, imageHeight - 18, imageWidth - 18, imageHeight - 18);
            linFgCtx.lineTo(imageWidth - 18, 18);
            linFgCtx.bezierCurveTo(imageWidth - 18, 18, imageWidth - 27, 27, imageWidth * 0.5, 27);
            linFgCtx.bezierCurveTo(27, 27, 18, 18, 18, 18);
            linFgCtx.closePath();

            foregroundGradient = linFgCtx.createLinearGradient(14, 0, (imageWidth - 14), 0);
        } else {
*/            // GLASSEFFECT_HORIZONTAL
            linFgCtx.save();
            linFgCtx.beginPath();
            linFgCtx.moveTo(18, imageHeight - 18);
            linFgCtx.lineTo(imageWidth - 18, imageHeight - 18);
            linFgCtx.bezierCurveTo(imageWidth - 18, imageHeight - 18, imageWidth - 27, imageHeight * 0.7, imageWidth - 27, imageHeight * 0.5);
            linFgCtx.bezierCurveTo(imageWidth - 27, 27, imageWidth - 18, 18, imageWidth - 18, 18);
            linFgCtx.lineTo(18, 18);
            linFgCtx.bezierCurveTo(18, 18, 27, imageHeight * 0.285714, 27, imageHeight * 0.5);
            linFgCtx.bezierCurveTo(27, imageHeight * 0.7, 18, imageHeight - 18, 18, imageHeight - 18);
            linFgCtx.closePath();

            foregroundGradient = linFgCtx.createLinearGradient(0, (imageHeight - 14), 0, 14);
//        }

        foregroundGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.06, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.07, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.12, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.17, 'rgba(255, 255, 255, 0.013546)');
        foregroundGradient.addColorStop(0.1701, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.79, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(0.84, 'rgba(255, 255, 255, 0.082217)');
        foregroundGradient.addColorStop(0.93, 'rgba(255, 255, 255, 0.288702)');
        foregroundGradient.addColorStop(0.94, 'rgba(255, 255, 255, 0.298039)');
        foregroundGradient.addColorStop(0.96, 'rgba(255, 255, 255, 0.119213)');
        foregroundGradient.addColorStop(0.97, 'rgba(255, 255, 255, 0)');
        foregroundGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        linFgCtx.fillStyle = foregroundGradient;
        linFgCtx.fill();

        ctx.drawImage(linFgBuffer, 0, 0);

        ctx.restore();

        return this;
    };

    var createKnobImage = function(size, knob, style, shadow) {
        var knobBuffer = doc.createElement('canvas');
        knobBuffer.width = size * 1.18889;
        knobBuffer.height = size * 1.18889;
        var knobCtx = knobBuffer.getContext('2d');

        knobCtx.save();
        var maxPostCenterX = size / 2;
        var maxPostCenterY = size / 2;

        if (shadow) {
            // Canvas Shadows are only drawn if the shadowBlur and shadowOffset values are non-zero
            // As we want the shadow to be in the same place as the knob we cannot use this, so shadow will be hard edged.
            knobCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            knobCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        }

        // Offset the drawing to leave room for shadows
        knobCtx.translate(size * 0.06, size * 0.06);

        switch(knob.type) {
            case 'metalKnob':
                // METALKNOB_FRAME
                knobCtx.beginPath();
                knobCtx.moveTo(0, size * 0.5);
                knobCtx.bezierCurveTo(0, size * 0.222222, size * 0.222222, 0, size * 0.5, 0);
                knobCtx.bezierCurveTo(size * 0.777777, 0, size, size * 0.222222, size, size * 0.5);
                knobCtx.bezierCurveTo(size, size * 0.777777, size * 0.777777, size, size * 0.5, size);
                knobCtx.bezierCurveTo(size * 0.222222, size, 0, size * 0.777777, 0, size * 0.5);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobFrameGradient = knobCtx.createLinearGradient(0, 0, 0, size);
                    metalKnobFrameGradient.addColorStop(0, 'rgb(92, 95, 101)');
                    metalKnobFrameGradient.addColorStop(0.47, 'rgb(46, 49, 53)');
                    metalKnobFrameGradient.addColorStop(1, 'rgb(22, 23, 26)');
                    knobCtx.fillStyle = metalKnobFrameGradient;
                }
                knobCtx.fill();

                // METALKNOB_MAIN
//                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.055555, size * 0.5);
                knobCtx.bezierCurveTo(size * 0.055555, size * 0.277777, size * 0.277777, size * 0.055555, size * 0.5, size * 0.055555);
                knobCtx.bezierCurveTo(size * 0.722222, size * 0.055555, size * 0.944444, size * 0.277777, size * 0.944444, size * 0.5);
                knobCtx.bezierCurveTo(size * 0.944444, size * 0.722222, size * 0.722222, size * 0.944444, size * 0.5, size * 0.944444);
                knobCtx.bezierCurveTo(size * 0.277777, size * 0.944444, size * 0.055555, size * 0.722222, size * 0.055555, size * 0.5);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobMainGradient = knobCtx.createLinearGradient(0, 0.055555 * size, 0, 0.944443 * size);
                    switch(style.style) {
                        case 'black':
                            metalKnobMainGradient.addColorStop(0, 'rgb(43, 42, 47)');
                            metalKnobMainGradient.addColorStop(1, 'rgb(26, 27, 32)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;

                        case 'brass':
                            metalKnobMainGradient.addColorStop(0, 'rgb(150, 110, 54)');
                            metalKnobMainGradient.addColorStop(1, 'rgb(124, 95, 61)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;

                        case 'silver':
                        default:
                            metalKnobMainGradient.addColorStop(0, 'rgb(204, 204, 204)');
                            metalKnobMainGradient.addColorStop(1, 'rgb(87, 92, 98)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;
                    }
                } else {
                    knobCtx.fill();
                }

                // METALKNOB_LOWERHL
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.777777, size * 0.833333);
                knobCtx.bezierCurveTo(size * 0.722222, size * 0.722222, size * 0.611111, size * 0.666666, size * 0.5, size * 0.666666);
                knobCtx.bezierCurveTo(size * 0.388888, size * 0.666666, size * 0.277777, size * 0.722222, size * 0.222222, size * 0.833333);
                knobCtx.bezierCurveTo(size * 0.277777, size * 0.888888, size * 0.388888, size * 0.944444, size * 0.5, size * 0.944444);
                knobCtx.bezierCurveTo(size * 0.611111, size * 0.944444, size * 0.722222, size * 0.888888, size * 0.777777, size * 0.833333);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobLowerHlGradient = knobCtx.createRadialGradient((0.555555) * size, ((0.944444) * size), 0, ((0.555555) * size), ((0.944444) * size), 0.388888 * size);
                    metalKnobLowerHlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
                    metalKnobLowerHlGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    knobCtx.fillStyle = metalKnobLowerHlGradient;
                }
                knobCtx.fill();

                // METALKNOB_UPPERHL
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.944444, size * 0.277777);
                knobCtx.bezierCurveTo(size * 0.833333, size * 0.111111, size * 0.666666, 0, size * 0.5, 0);
                knobCtx.bezierCurveTo(size * 0.333333, 0, size * 0.166666, size * 0.111111, size * 0.055555, size * 0.277777);
                knobCtx.bezierCurveTo(size * 0.166666, size * 0.333333, size * 0.333333, size * 0.388888, size * 0.5, size * 0.388888);
                knobCtx.bezierCurveTo(size * 0.666666, size * 0.388888, size * 0.833333, size * 0.333333, size * 0.944444, size * 0.277777);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobUpperHlGradient = knobCtx.createRadialGradient(0.5 * size, 0, 0, ((0.5) * size), 0, 0.583333 * size);
                    metalKnobUpperHlGradient.addColorStop(0, 'rgba(255, 255, 255, 0.749019)');
                    metalKnobUpperHlGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    knobCtx.fillStyle = metalKnobUpperHlGradient;
                }
                knobCtx.fill();

                // METALKNOB_INNERFRAME
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.277777, size * 0.555555);
                knobCtx.bezierCurveTo(size * 0.277777, size * 0.388888, size * 0.388888, size * 0.277777, size * 0.5, size * 0.277777);
                knobCtx.bezierCurveTo(size * 0.611111, size * 0.277777, size * 0.777777, size * 0.388888, size * 0.777777, size * 0.555555);
                knobCtx.bezierCurveTo(size * 0.777777, size * 0.666666, size * 0.611111, size * 0.777777, size * 0.5, size * 0.777777);
                knobCtx.bezierCurveTo(size * 0.388888, size * 0.777777, size * 0.277777, size * 0.666666, size * 0.277777, size * 0.555555);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobInnerFrameGradient = knobCtx.createLinearGradient(0, 0.277777 * size, 0, 0.722221 * size);
                    metalKnobInnerFrameGradient.addColorStop(0, '#000000');
                    metalKnobInnerFrameGradient.addColorStop(1, 'rgb(204, 204, 204)');
                    knobCtx.fillStyle = metalKnobInnerFrameGradient;
                }
                knobCtx.fill();

                // METALKNOB_INNERBACKGROUND
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.333333, size * 0.555555);
                knobCtx.bezierCurveTo(size * 0.333333, size * 0.444444, size * 0.388888, size * 0.333333, size * 0.5, size * 0.333333);
                knobCtx.bezierCurveTo(size * 0.611111, size * 0.333333, size * 0.722222, size * 0.444444, size * 0.722222, size * 0.555555);
                knobCtx.bezierCurveTo(size * 0.722222, size * 0.611111, size * 0.611111, size * 0.722222, size * 0.5, size * 0.722222);
                knobCtx.bezierCurveTo(size * 0.388888, size * 0.722222, size * 0.333333, size * 0.611111, size * 0.333333, size * 0.555555);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobInnerBackgroundGradient = knobCtx.createLinearGradient(0, 0.333333 * size, 0, 0.666666 * size);
                    metalKnobInnerBackgroundGradient.addColorStop(0, 'rgb(10, 9, 1)');
                    metalKnobInnerBackgroundGradient.addColorStop(1, 'rgb(42, 41, 37)');
                    knobCtx.fillStyle = metalKnobInnerBackgroundGradient;
                }
                knobCtx.fill();
                break;

            case 'standardKnob':
                if (!shadow) {
                    var stdKnobFrameGradient = knobCtx.createLinearGradient(0, 0, 0, size);
                    stdKnobFrameGradient.addColorStop(0, 'rgb(180, 180, 180)');
                    stdKnobFrameGradient.addColorStop(0.46, 'rgb(63, 63, 63)');
                    stdKnobFrameGradient.addColorStop(1, 'rgb(40, 40, 40)');
                    knobCtx.fillStyle = stdKnobFrameGradient;
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size / 2, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();

                if (!shadow) {
                    var stdKnobMainGradient = knobCtx.createLinearGradient(0, size - size * 0.77, 0, size - size * 0.77 + size * 0.77);
                    switch(style.style) {
                        case 'black':
                            stdKnobMainGradient.addColorStop(0, 'rgb(191, 191, 191)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgb(45, 44, 49)');
                            stdKnobMainGradient.addColorStop(1, 'rgb(125, 126, 128)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;

                        case 'brass':
                            stdKnobMainGradient.addColorStop(0, 'rgb(223, 208, 174)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgb(123, 95, 63)');
                            stdKnobMainGradient.addColorStop(1, 'rgb(207, 190, 157)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;

                        case 'silver':
                        default:
                            stdKnobMainGradient.addColorStop(0, 'rgb(215, 215, 215)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgb(116, 116, 116)');
                            stdKnobMainGradient.addColorStop(1, 'rgb(215, 215, 215)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;
                    }
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size * 0.77 / 2, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();

                if (!shadow) {
                    var stdKnobInnerShadowGradient = knobCtx.createRadialGradient(maxPostCenterX, maxPostCenterY, 0, maxPostCenterX, maxPostCenterY, size * 0.77 / 2);
                    stdKnobInnerShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    stdKnobInnerShadowGradient.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
                    stdKnobInnerShadowGradient.addColorStop(0.76, 'rgba(0, 0, 0, 0.01)');
                    stdKnobInnerShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
                    knobCtx.fillStyle = stdKnobInnerShadowGradient;
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size * 0.77 / 2, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();
                break;
        }
//        knobCtx.restore();
        //  Negate the offset the drawing to leave room for shadows
        knobCtx.translate(-size * 0.06, -size * 0.06);

        if (shadow) {
            // Apply the shadow blur
            blur(knobCtx, knobBuffer.width, knobBuffer.height, Math.floor(size * 0.06));
        }
        return knobBuffer;
    };

    var createLedImage = function(size, state, ledColor) {
        var ledBuffer = doc.createElement('canvas');
        ledBuffer.width = size;
        ledBuffer.height = size;
        var ledCtx = ledBuffer.getContext('2d');

        var ledCenterX = size / 2;
        var ledCenterY = size / 2;

        var ledOffGradient;
        var lightReflex;

        switch (state) {
            case 0: // LED OFF
                // OFF Gradient
                ledCtx.save();
                ledOffGradient = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2);
                ledOffGradient.addColorStop(0, ledColor.innerColor1_OFF);
                ledOffGradient.addColorStop(0.2, ledColor.innerColor2_OFF);
                ledOffGradient.addColorStop(1, ledColor.outerColor_OFF);
                ledCtx.fillStyle = ledOffGradient;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // InnerShadow
                ledCtx.save();
                var ledOffInnerShadow = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2);
                ledOffInnerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                ledOffInnerShadow.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
                ledOffInnerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
                ledCtx.fillStyle = ledOffInnerShadow;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // LightReflex
                ledCtx.save();
                lightReflex = ledCtx.createLinearGradient(0, 0.35 * size, 0, 0.35 * size + 0.15 * size);
                lightReflex.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                lightReflex.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ledCtx.fillStyle = lightReflex;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, 0.35 * size + 0.2 * size / 2, size * 0.2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();
                break;

            case 1: // LED ON
                // ON Gradient
                ledCtx.save();
                ledOffGradient = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2);
                ledOffGradient.addColorStop(0, ledColor.innerColor1_ON);
                ledOffGradient.addColorStop(0.2, ledColor.innerColor2_ON);
                ledOffGradient.addColorStop(1, ledColor.outerColor_ON);
                ledCtx.fillStyle = ledOffGradient;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // InnerShadow
                ledCtx.save();
                var ledOnInnerShadow = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2);
                ledOnInnerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                ledOnInnerShadow.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
                ledOnInnerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
                ledCtx.fillStyle = ledOnInnerShadow;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // LightReflex
                ledCtx.save();
                lightReflex = ledCtx.createLinearGradient(0, 0.35 * size, 0, 0.35 * size + 0.15 * size);
                lightReflex.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                lightReflex.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ledCtx.fillStyle = lightReflex;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, 0.35 * size + 0.2 * size / 2, size * 0.2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // Corona
                ledCtx.save();
                var ledCorona = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size / 2);
                ledCorona.addColorStop(0, setAlpha(ledColor.coronaColor, 0).color);
                ledCorona.addColorStop(0.6, setAlpha(ledColor.coronaColor, 0.4).color);
                ledCorona.addColorStop(0.7, setAlpha(ledColor.coronaColor, 0.25).color);
                ledCorona.addColorStop(0.8, setAlpha(ledColor.coronaColor, 0.15).color);
                ledCorona.addColorStop(0.85, setAlpha(ledColor.coronaColor, 0.05).color);
                ledCorona.addColorStop(1, setAlpha(ledColor.coronaColor, 0).color);
                ledCtx.fillStyle = ledCorona;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size / 2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();
                break;
        }

        return ledBuffer;
    };

    var createLcdBackgroundImage = function(width, height, lcdColor) {
        var lcdBuffer = createBuffer(width, height);
        var lcdCtx = lcdBuffer.getContext('2d');

        lcdCtx.save();
        var xB = 0;
        var yB = 0;
        var wB = width;
        var hB = height;
        var rB = Math.min(width, height) * 0.095;

        var lcdBackground = lcdCtx.createLinearGradient(0, yB, 0, yB + hB);
        lcdBackground.addColorStop(0, '#4c4c4c');
        lcdBackground.addColorStop(0.08, '#666666');
        lcdBackground.addColorStop(0.92, '#666666');
        lcdBackground.addColorStop(1, '#e6e6e6');
        lcdCtx.fillStyle = lcdBackground;

        roundedRectangle(lcdCtx, xB, yB, wB, hB, rB);

        lcdCtx.fill();
        lcdCtx.restore();

        lcdCtx.save();
        var xF = 1;
        var yF = 1;
        var wF = width - 2;
        var hF = height - 2;
        var rF = rB - 1;

        var lcdForeground = lcdCtx.createLinearGradient(0, yF, 0, yF + hF);
        lcdForeground.addColorStop(0, lcdColor.gradientStartColor);
        lcdForeground.addColorStop(0.03, lcdColor.gradientFraction1Color);
        lcdForeground.addColorStop(0.49, lcdColor.gradientFraction2Color);
        lcdForeground.addColorStop(0.5, lcdColor.gradientFraction3Color);
        lcdForeground.addColorStop(1, lcdColor.gradientStopColor);
        lcdCtx.fillStyle = lcdForeground;

        roundedRectangle(lcdCtx, xF, yF, wF, hF, rF);

        lcdCtx.fill();
        lcdCtx.restore();

        return lcdBuffer;
    };

    var createMeasuredValueImage = function(size, indicatorColor, radial, vertical) {
        var indicatorBuffer = doc.createElement('canvas');
        indicatorBuffer.width = size;
        indicatorBuffer.height = size;
        var indicatorCtx = indicatorBuffer.getContext('2d');
        indicatorCtx.save();
        indicatorCtx.fillStyle = indicatorColor;
        if (radial) {
            indicatorCtx.beginPath();
            indicatorCtx.moveTo(size * 0.5, size);
            indicatorCtx.lineTo(0, 0);
            indicatorCtx.lineTo(size, 0);
            indicatorCtx.closePath();
            indicatorCtx.fill();
        } else {
            if (vertical) {
                indicatorCtx.beginPath();
                indicatorCtx.moveTo(size, size * 0.5);
                indicatorCtx.lineTo(0, 0);
                indicatorCtx.lineTo(0, size);
                indicatorCtx.closePath();
                indicatorCtx.fill();
            } else {
                indicatorCtx.beginPath();
                indicatorCtx.moveTo(size * 0.5, 0);
                indicatorCtx.lineTo(size, size);
                indicatorCtx.lineTo(0, size);
                indicatorCtx.closePath();
                indicatorCtx.fill();
            }
        }
        indicatorCtx.restore();

        return indicatorBuffer;
    };

    var createTrendIndicator = function(width, onSection, colors) {
        var height = width * 2;
        // create oversized buffer for the glow
        var trendBuffer = createBuffer(width * 2, width * 4);
        var trendCtx = trendBuffer.getContext('2d');
        var fill, stroke;

        var drawUpArrow = function () {
            // draw up arrow (red)
            var ledColor = colors[0];
            if (onSection.state === 'up') {
                fill = trendCtx.createRadialGradient(0.5 * width, 0.2 * height, 0, 0.5 * width, 0.2 * height, 0.5 * width);
                fill.addColorStop(0, ledColor.innerColor1_ON);
                fill.addColorStop(0.2, ledColor.innerColor2_ON);
                fill.addColorStop(1, ledColor.outerColor_ON);
            } else {
                fill = trendCtx.createLinearGradient(0, 0, 0, 0.5 * height);
                fill.addColorStop(0, '#323232');
                fill.addColorStop(1, '#5c5c5c');
            }
            trendCtx.fillStyle = fill;
            trendCtx.beginPath();
            trendCtx.moveTo(0.5 * width, 0);
            trendCtx.lineTo(width, 0.2 * height);
            trendCtx.lineTo(0.752 * width, 0.2 * height);
            trendCtx.lineTo(0.752 * width, 0.37 * height);
            trendCtx.lineTo(0.252 * width, 0.37 * height);
            trendCtx.lineTo(0.252 * width, 0.2 * height);
            trendCtx.lineTo(0, 0.2 * height);
            trendCtx.closePath();
            trendCtx.fill();
            if (onSection.state !== 'up') {
                // Inner shadow
                trendCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                trendCtx.beginPath();
                trendCtx.moveTo(0, 0.2 * height);
                trendCtx.lineTo(0.5 * width, 0);
                trendCtx.lineTo(width, 0.2 * height);
                trendCtx.moveTo(0.252 * width, 0.2 * height);
                trendCtx.lineTo(0.252 * width, 0.37 * height);
                trendCtx.stroke();
                // Inner highlight
                trendCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                trendCtx.beginPath();
                trendCtx.moveTo(0.252 * width, 0.37 * height);
                trendCtx.lineTo(0.752 * width, 0.37 * height);
                trendCtx.lineTo(0.752 * width, 0.2 * height);
                trendCtx.lineTo(width, 0.2 * height);
                trendCtx.stroke();
            } else {
                // draw halo
                fill = trendCtx.createRadialGradient(0.5 * width, 0.2 * height, 0, 0.5 * width, 0.2 * height, 0.7 * width);
                fill.addColorStop(0, setAlpha(ledColor.coronaColor, 0).color);
                fill.addColorStop(0.5, setAlpha(ledColor.coronaColor, 0.3).color);
                fill.addColorStop(0.7, setAlpha(ledColor.coronaColor, 0.2).color);
                fill.addColorStop(0.8, setAlpha(ledColor.coronaColor, 0.1).color);
                fill.addColorStop(0.85, setAlpha(ledColor.coronaColor, 0.05).color);
                fill.addColorStop(1, setAlpha(ledColor.coronaColor, 0).color);
                trendCtx.fillStyle = fill;

                trendCtx.beginPath();
                trendCtx.arc(0.5 * width, 0.2 * height, 0.7 * width, 0, Math.PI * 2, true);
                trendCtx.closePath();
                trendCtx.fill();
            }
        };

        var drawEquals = function() {
            // draw equal symbol
            ledColor = colors[1];
            trendCtx.beginPath();
            if (onSection.state === 'steady') {
                fill = ledColor.outerColor_ON;
                trendCtx.fillStyle = fill;
                trendCtx.rect(0.128 * width, 0.41 * height, 0.744* width, 0.074 * height);
                trendCtx.rect(0.128 * width, 0.516 * height, 0.744* width, 0.074 * height);
                trendCtx.closePath();
                trendCtx.fill();
            } else {
                fill = trendCtx.createLinearGradient(0, 0.41 * height, 0, 0.41 * height + 0.074 * height);
                fill.addColorStop(0, '#323232');
                fill.addColorStop(1, '#5c5c5c');
                trendCtx.fillStyle = fill;
                trendCtx.rect(0.128 * width, 0.41 * height, 0.744* width, 0.074 * height);
                trendCtx.closePath();
                trendCtx.fill();
                fill = trendCtx.createLinearGradient(0, 0.516 * height, 0, 0.516 * height + 0.074 * height);
                fill.addColorStop(0, '#323232');
                fill.addColorStop(1, '#5c5c5c');
                trendCtx.fillStyle = fill;
                trendCtx.rect(0.128 * width, 0.516 * height, 0.744* width, 0.074 * height);
                trendCtx.closePath();
                trendCtx.fill();
            }
            if (onSection.state !== 'steady') {
                // inner shadow
                trendCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                trendCtx.beginPath();
                trendCtx.moveTo(0.128 * width, 0.41 * height + 0.074 * height);
                trendCtx.lineTo(0.128 * width, 0.41 * height);
                trendCtx.lineTo(0.128 * width + 0.744 * width, 0.41 * height);
                trendCtx.stroke();
                trendCtx.beginPath();
                trendCtx.moveTo(0.128 * width, 0.516 * height + 0.074 * height);
                trendCtx.lineTo(0.128 * width, 0.516 * height);
                trendCtx.lineTo(0.128 * width + 0.744 * width, 0.516 * height);
                trendCtx.stroke();
                // inner highlight
                trendCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                trendCtx.beginPath();
                trendCtx.moveTo(0.128 * width + 0.744 * width, 0.41 * height);
                trendCtx.lineTo(0.128 * width + 0.744 * width, 0.41 * height + 0.074 * height);
                trendCtx.lineTo(0.128 * width, 0.41 * height + 0.074 * height);
                trendCtx.stroke();
                trendCtx.beginPath();
                trendCtx.moveTo(0.128 * width + 0.744 * width, 0.516 * height);
                trendCtx.lineTo(0.128 * width + 0.744 * width, 0.516 * height + 0.074 * height);
                trendCtx.lineTo(0.128 * width, 0.516 * height + 0.074 * height);
                trendCtx.stroke();
            } else {
                // draw halo
                fill = trendCtx.createRadialGradient(0.5 * width, 0.5 * height, 0, 0.5 * width, 0.5 * height, 0.7 * width);
                fill.addColorStop(0, setAlpha(ledColor.coronaColor, 0).color);
                fill.addColorStop(0.5, setAlpha(ledColor.coronaColor, 0.3).color);
                fill.addColorStop(0.7, setAlpha(ledColor.coronaColor, 0.2).color);
                fill.addColorStop(0.8, setAlpha(ledColor.coronaColor, 0.1).color);
                fill.addColorStop(0.85, setAlpha(ledColor.coronaColor, 0.05).color);
                fill.addColorStop(1, setAlpha(ledColor.coronaColor, 0).color);
                trendCtx.fillStyle = fill;
                trendCtx.beginPath();
                trendCtx.arc(0.5 * width, 0.5 * height, 0.7 * width, 0, Math.PI * 2, true);
                trendCtx.closePath();
                trendCtx.fill();
            }
        };

        var drawDownArrow = function () {
            // draw down arrow
            ledColor = colors[2];
            if (onSection.state === 'down') {
                fill = trendCtx.createRadialGradient(0.5 * width, 0.8 * height, 0, 0.5 * width, 0.8 * height, 0.5 * width);
                fill.addColorStop(0, ledColor.innerColor1_ON);
                fill.addColorStop(0.2, ledColor.innerColor2_ON);
                fill.addColorStop(1, ledColor.outerColor_ON);
            } else {
                fill = trendCtx.createLinearGradient(0, 0.63 * height, 0, height);
                fill.addColorStop(0, '#323232');
                fill.addColorStop(1, '#5c5c5c');
            }
            trendCtx.beginPath();
            trendCtx.fillStyle = fill;
            trendCtx.moveTo(0.5 * width, height);
            trendCtx.lineTo(width, 0.8 * height);
            trendCtx.lineTo(0.725 * width, 0.8 * height);
            trendCtx.lineTo(0.725 * width, 0.63 * height);
            trendCtx.lineTo(0.252 * width, 0.63 * height);
            trendCtx.lineTo(0.252 * width, 0.8 * height);
            trendCtx.lineTo(0, 0.8 * height);
            trendCtx.closePath();
            trendCtx.fill();
            if (onSection.state !== 'down') {
                // Inner shadow
                trendCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                trendCtx.beginPath();
                trendCtx.moveTo(0, 0.8 * height);
                trendCtx.lineTo(0.252 * width, 0.8 * height);
                trendCtx.moveTo(0.252 * width, 0.63 * height);
                trendCtx.lineTo(0.752 * width, 0.63 * height);
                trendCtx.stroke();
                trendCtx.beginPath();
                trendCtx.moveTo(0.752 * width, 0.8 * height);
                trendCtx.lineTo(width, 0.8 * height);
                trendCtx.stroke();
                // Inner highlight
                trendCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                trendCtx.beginPath();
                trendCtx.moveTo(0, 0.8 * height);
                trendCtx.lineTo(0.5 * width, height);
                trendCtx.lineTo(width, 0.8 * height);
                trendCtx.stroke();
                trendCtx.beginPath();
                trendCtx.moveTo(0.752 * width, 0.8 * height);
                trendCtx.lineTo(0.752 * width, 0.63 * height);
                trendCtx.stroke();
            } else {
                // draw halo
                fill = trendCtx.createRadialGradient(0.5 * width, 0.8 * height, 0, 0.5 * width, 0.8 * height, 0.7 * width);
                fill.addColorStop(0, setAlpha(ledColor.coronaColor, 0).color);
                fill.addColorStop(0.5, setAlpha(ledColor.coronaColor, 0.3).color);
                fill.addColorStop(0.7, setAlpha(ledColor.coronaColor, 0.2).color);
                fill.addColorStop(0.8, setAlpha(ledColor.coronaColor, 0.1).color);
                fill.addColorStop(0.85, setAlpha(ledColor.coronaColor, 0.05).color);
                fill.addColorStop(1, setAlpha(ledColor.coronaColor, 0).color);
                trendCtx.fillStyle = fill;
                trendCtx.beginPath();
                trendCtx.arc(0.5 * width, 0.8 * height, 0.7 * width, 0, Math.PI * 2, true);
                trendCtx.closePath();
                trendCtx.fill();
            }
        };

        trendCtx.save();
        trendCtx.translate(width * 0.5, width * 0.5);
        // Must draw the active section last so the 'glow' is on top
        switch (onSection.state) {
            case 'up':
                drawDownArrow();
                drawEquals();
                drawUpArrow();
                break;
            case 'steady':
                drawDownArrow();
                drawUpArrow();
                drawEquals();
                break;
            case 'down':
            default:
                drawUpArrow();
                drawEquals();
                drawDownArrow();
                break;
        }
        return trendBuffer;
    }

    var drawTitleImage = function(ctx, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, radial, altPos) {

        ctx.save();
        ctx.textAlign = (radial ? 'center' : 'left');
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
        ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

        if (radial) {
            ctx.font = 0.046728 * imageWidth + 'px sans-serif';
            ctx.fillText(titleString, imageWidth / 2, imageHeight * 0.3, imageWidth * 0.3);
            ctx.fillText(unitString, imageWidth / 2, imageHeight * 0.38, imageWidth * 0.3);
        } else {
            if (vertical) {
                ctx.font = 0.1 * imageWidth + 'px sans-serif';
                ctx.save();
                ctx.translate(0.671428 * imageWidth, 0.1375 * imageHeight);
                ctx.rotate(1.570796);
                ctx.fillText(titleString, 0, 0);
                ctx.translate(-0.671428 * imageWidth, -0.1375 * imageHeight);
                ctx.restore();
                ctx.font = 0.071428 * imageWidth + 'px sans-serif';
                if (altPos) {
                    ctx.fillText(unitString, 0.63 * imageWidth, imageHeight * 0.85, imageWidth * 0.2);
                } else {
                    ctx.fillText(unitString, imageWidth / 2, imageHeight * 0.89, imageWidth * 0.2);
                }
            } else { //linear
                ctx.font = 0.035 * imageWidth + 'px sans-serif';
                ctx.fillText(titleString, imageWidth * 0.15, imageHeight * 0.25, imageWidth * 0.3);
                ctx.font = 0.025 * imageWidth + 'px sans-serif';
                ctx.fillText(unitString, imageWidth * 0.0625, imageHeight * 0.7, imageWidth * 0.07);
            }
        }
        ctx.restore();
    };

    //*****************************************   T E X T U R E S   ****************************************************
    var carbonBuffer = drawToBuffer(12, 12, function(ctx) {
            var imageWidth = ctx.canvas.width;
            var imageHeight = ctx.canvas.height;
            var offsetX = 0;
            var offsetY = 0;
            ctx.save();

            // RULB
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();

            var RULB_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.5 * imageHeight + offsetY * imageHeight);
            RULB_GRADIENT.addColorStop(0, 'rgb(35, 35, 35)');
            RULB_GRADIENT.addColorStop(1, 'rgb(23, 23, 23)');
            ctx.fillStyle = RULB_GRADIENT;
            ctx.fill();

            // RULF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.083333, 0, imageWidth * 0.333333, imageHeight * 0.416666);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.083333;
            offsetY = 0;
            var RULF_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.416666 * imageHeight + offsetY * imageHeight);
            RULF_GRADIENT.addColorStop(0, 'rgb(38, 38, 38)');
            RULF_GRADIENT.addColorStop(1, 'rgb(30, 30, 30)');
            ctx.fillStyle = RULF_GRADIENT;
            ctx.fill();

            // RLRB
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.5, imageHeight * 0.5, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.5;
            offsetY = 0.5;
            var RLRB_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.5 * imageHeight + offsetY * imageHeight);
            RLRB_GRADIENT.addColorStop(0, 'rgb(35, 35, 35)');
            RLRB_GRADIENT.addColorStop(1, 'rgb(23, 23, 23)');
            ctx.fillStyle = RLRB_GRADIENT;
            ctx.fill();

            // RLRF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.583333, imageHeight * 0.5, imageWidth * 0.333333, imageHeight * 0.416666);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.583333;
            offsetY = 0.5;
            var RLRF_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.416666 * imageHeight + offsetY * imageHeight);
            RLRF_GRADIENT.addColorStop(0, 'rgb(38, 38, 38)');
            RLRF_GRADIENT.addColorStop(1, 'rgb(30, 30, 30)');
            ctx.fillStyle = RLRF_GRADIENT;
            ctx.fill();

            // RURB
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.5, 0, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.5;
            offsetY = 0;
            var RURB_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.5 * imageHeight + offsetY * imageHeight);
            RURB_GRADIENT.addColorStop(0, '#303030');
            RURB_GRADIENT.addColorStop(1, 'rgb(40, 40, 40)');
            ctx.fillStyle = RURB_GRADIENT;
            ctx.fill();

            // RURF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.583333, imageHeight * 0.083333, imageWidth * 0.333333, imageHeight * 0.416666);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.583333;
            offsetY = 0.083333;
            var RURF_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.416666 * imageHeight + offsetY * imageHeight);
            RURF_GRADIENT.addColorStop(0, 'rgb(53, 53, 53)');
            RURF_GRADIENT.addColorStop(1, 'rgb(45, 45, 45)');
            ctx.fillStyle = RURF_GRADIENT;
            ctx.fill();

            // RLLB
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, imageHeight * 0.5, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();
            offsetX = 0;
            offsetY = 0.5;
            var RLLB_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.5 * imageHeight + offsetY * imageHeight);
            RLLB_GRADIENT.addColorStop(0, '#303030');
            RLLB_GRADIENT.addColorStop(1, '#282828');
            ctx.fillStyle = RLLB_GRADIENT;
            ctx.fill();

            // RLLF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.083333, imageHeight * 0.583333, imageWidth * 0.333333, imageHeight * 0.416666);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.083333;
            offsetY = 0.583333;
            var RLLF_GRADIENT = ctx.createLinearGradient(0, offsetY * imageHeight, 0, 0.416666 * imageHeight + offsetY * imageHeight);
            RLLF_GRADIENT.addColorStop(0, '#353535');
            RLLF_GRADIENT.addColorStop(1, '#2d2d2d');
            ctx.fillStyle = RLLF_GRADIENT;
            ctx.fill();

            ctx.restore();
        });

    var punchedSheetBuffer = drawToBuffer(15, 15, function(ctx) {
        var imageWidth = ctx.canvas.width;
        var imageHeight = ctx.canvas.height;

        ctx.save();

        // BACK
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, imageWidth, imageHeight);
        ctx.closePath();
        ctx.restore();
        var fillColor_BACK = '#1D2123';
        ctx.fillStyle = fillColor_BACK;
        ctx.fill();

        // ULB
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, imageHeight * 0.266666);
        ctx.bezierCurveTo(0, imageHeight * 0.4, imageWidth * 0.066666, imageHeight * 0.466666, imageWidth * 0.2, imageHeight * 0.466666);
        ctx.bezierCurveTo(imageWidth * 0.333333, imageHeight * 0.466666, imageWidth * 0.4, imageHeight * 0.4, imageWidth * 0.4, imageHeight * 0.266666);
        ctx.bezierCurveTo(imageWidth * 0.4, imageHeight * 0.133333, imageWidth * 0.333333, imageHeight * 0.066666, imageWidth * 0.2, imageHeight * 0.066666);
        ctx.bezierCurveTo(imageWidth * 0.066666, imageHeight * 0.066666, 0, imageHeight * 0.133333, 0, imageHeight * 0.266666);
        ctx.closePath();
        var ULB_GRADIENT = ctx.createLinearGradient(0, 0.066666 * imageHeight, 0, 0.466666 * imageHeight);
        ULB_GRADIENT.addColorStop(0, '#000000');
        ULB_GRADIENT.addColorStop(1, '#444444');
        ctx.fillStyle = ULB_GRADIENT;
        ctx.fill();

        // ULF
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, imageHeight * 0.2);
        ctx.bezierCurveTo(0, imageHeight * 0.333333, imageWidth * 0.066666, imageHeight * 0.4, imageWidth * 0.2, imageHeight * 0.4);
        ctx.bezierCurveTo(imageWidth * 0.333333, imageHeight * 0.4, imageWidth * 0.4, imageHeight * 0.333333, imageWidth * 0.4, imageHeight * 0.2);
        ctx.bezierCurveTo(imageWidth * 0.4, imageHeight * 0.066666, imageWidth * 0.333333, 0, imageWidth * 0.2, 0);
        ctx.bezierCurveTo(imageWidth * 0.066666, 0, 0, imageHeight * 0.066666, 0, imageHeight * 0.2);
        ctx.closePath();
        var fillColor_ULF = '#050506';
        ctx.fillStyle = fillColor_ULF;
        ctx.fill();

        // LRB
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.466666, imageHeight * 0.733333);
        ctx.bezierCurveTo(imageWidth * 0.466666, imageHeight * 0.866666, imageWidth * 0.533333, imageHeight * 0.933333, imageWidth * 0.666666, imageHeight * 0.933333);
        ctx.bezierCurveTo(imageWidth * 0.8, imageHeight * 0.933333, imageWidth * 0.866666, imageHeight * 0.866666, imageWidth * 0.866666, imageHeight * 0.733333);
        ctx.bezierCurveTo(imageWidth * 0.866666, imageHeight * 0.6, imageWidth * 0.8, imageHeight * 0.533333, imageWidth * 0.666666, imageHeight * 0.533333);
        ctx.bezierCurveTo(imageWidth * 0.533333, imageHeight * 0.533333, imageWidth * 0.466666, imageHeight * 0.6, imageWidth * 0.466666, imageHeight * 0.733333);
        ctx.closePath();
        var LRB_GRADIENT = ctx.createLinearGradient(0, 0.533333 * imageHeight, 0, 0.933333 * imageHeight);
        LRB_GRADIENT.addColorStop(0, '#000000');
        LRB_GRADIENT.addColorStop(1, '#444444');
        ctx.fillStyle = LRB_GRADIENT;
        ctx.fill();

        // LRF
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.466666, imageHeight * 0.666666);
        ctx.bezierCurveTo(imageWidth * 0.466666, imageHeight * 0.8, imageWidth * 0.533333, imageHeight * 0.866666, imageWidth * 0.666666, imageHeight * 0.866666);
        ctx.bezierCurveTo(imageWidth * 0.8, imageHeight * 0.866666, imageWidth * 0.866666, imageHeight * 0.8, imageWidth * 0.866666, imageHeight * 0.666666);
        ctx.bezierCurveTo(imageWidth * 0.866666, imageHeight * 0.533333, imageWidth * 0.8, imageHeight * 0.466666, imageWidth * 0.666666, imageHeight * 0.466666);
        ctx.bezierCurveTo(imageWidth * 0.533333, imageHeight * 0.466666, imageWidth * 0.466666, imageHeight * 0.533333, imageWidth * 0.466666, imageHeight * 0.666666);
        ctx.closePath();
        var fillColor_LRF = '#050506';
        ctx.fillStyle = fillColor_LRF;
        ctx.fill();

        ctx.restore();
    });

    var brushedMetalTexture = function(color, radius, amount, monochrome, shine) {

        this.fill = function(startX, startY, endX, endY) {
            startX = Math.floor(startX);
            startY = Math.floor(startY);
            endX = Math.ceil(endX);
            endY = Math.ceil(endY);

            var width = endX - startX;
            var height = endY - startY;

            // Create output canvas
            var outCanvas = createBuffer(width, height);
            var outCanvasContext = outCanvas.getContext('2d');

            // Create pixel arrays
            var inPixels = outCanvasContext.createImageData(width, height);
            var outPixels = outCanvasContext.createImageData(width, height);

            //var alpha = color & 0xff000000;
            var alpha = 255;
            var red = (color >> 16) & 0xff;
            var green = (color >> 8) & 0xff;
            var blue = color & 0xff;
            var n = 0;
            var variation = 255 * amount;

            // Precreate sin() values
            if (shine != 0) {
                var sinArr = [];
                for (var i = 0; i < width; i++) {
                    sinArr[i] = (255 * shine * Math.sin( i / width * Math.PI)) | 0;
                }
            }

            for (var y = 0; y < height; y++) {
                // The pixel array is addressed as 4 elements per pixel [r,g,b,a]
                if (radius != 0) {
                    var totR = 0;
                    var totG = 0;
                    var totB = 0;
                }
                for (var x = 0; x < width; x ++) {
                    var indx = (y * width * 4) + (x * 4);
                    var tr = red
                    var tg = green;
                    var tb = blue;
                    if (shine != 0) {
                        var f = sinArr[x];
                        tr += f;
                        tg += f;
                        tb += f;
                    }

                    if (monochrome) {
                        n = ((2 * Math.random() - 1) * variation) | 0;
                        inPixels.data[indx]   = clamp(tr + n);
                        inPixels.data[indx+1] = clamp(tg + n);
                        inPixels.data[indx+2] = clamp(tb + n);
                        inPixels.data[indx+3] = alpha;
                    } else {
                        inPixels.data[indx]   = random(tr, variation);
                        inPixels.data[indx+1] = random(tg, variation);
                        inPixels.data[indx+2] = random(tb, variation);
                        inPixels.data[indx+3] = alpha;
                    }
                }
            }

            if (radius > 0) {
                horizontalBlur(inPixels, outPixels, width, height, radius, alpha);
                outCanvasContext.putImageData(outPixels, startX, startY);
            } else {
                outCanvasContext.putImageData(inPixels, startX, startY);
            }
            return outCanvas;
        }

        function random(x, vari) {
            x += ((2 * Math.random() - 1) * vari) | 0;
            return (x < 0 ? 0 : (x > 255 ? 255 : x));
        }

        function clamp(C) {
            return (C < 0 ? 0 : (C > 255 ? 255 : C));
        }

        function horizontalBlur(inPix, outPix, width, height, radius, alpha) {
            if (radius >= width) {
                radius = width - 1;
            }
            var mul = 1 / (radius * 2 + 1);
            var indx = 0;
            for (var y = 0; y < height; y++) {
                var totR = 0;
                var totG = 0;
                var totB = 0;
                for (var x = 0; x < radius ; x++) {
                    var i = (indx + x) * 4;
                    totR += inPix.data[i];
                    totG += inPix.data[i + 1];
                    totB += inPix.data[i + 2];
                }
                for (var x = 0; x < width; x++) {
                    if (x > radius) {
                        var i = (indx - radius - 1) * 4;
                        totR -= inPix.data[i];
                        totG -= inPix.data[i + 1];
                        totB -= inPix.data[i + 2];
                    }
                    if (x + radius < width) {
                        var i = (indx + radius) * 4;
                        totR += inPix.data[i];
                        totG += inPix.data[i + 1];
                        totB += inPix.data[i + 2];
                    }
                    var i = indx * 4;
                    outPix.data[i] = (totR * mul) | 0;
                    outPix.data[i + 1] = (totG * mul) | 0;
                    outPix.data[i + 2] = (totB * mul) | 0;
                    outPix.data[i + 3] = alpha;
                    indx++;
                }
            }
        }

        return this;
    }

    //********************************************   T O O L S   *******************************************************
    var rgbaColor = function(r, g, b, a) {
        var red;
        var green;
        var blue;
        var alpha;

        if (arguments.length === 1) {
            // hexadecimal input #112233
            b = parseInt(r.substr(5,2), 16);
            g = parseInt(r.substr(3,2), 16);
            r = parseInt(r.substr(1,2), 16);
            a = 1
        } else if (arguments.length === 3) {
            a = 1;
        }

        validateColors();

        function validateColors() {
            red = 0 > r ? 0 : r;
            red = 255 < r ? 255 : r;
            green = 0 > g ? 0 : g;
            green = 255 < g ? 255 : g;
            blue = 0 > b ? 0 : b;
            blue = 255 < b ? 255 : b;
            alpha = 0 > a ? 0 : a;
            alpha = 1 < a ? 1 : a;
        }

        this.getRed = function() {
            return red;
        };

        this.setRed = function(r) {
            red = 0 > r ? 0 : r;
            red = 255 < r ? 255 : r;
        };

        this.getGreen = function() {
            return green;
        };

        this.setGreen = function(g) {
            green = 0 > g ? 0 : g;
            green = 255 < g ? 255 : g;
        };

        this.getBlue = function() {
            return blue;
        };

        this.setBlue = function(b) {
            blue = 0 > b ? 0 : b;
            blue = 255 < b ? 255 : b;
        };

        this.getAlpha = function() {
            return alpha;
        };

        this.setAlpha = function(a) {
            alpha = 0 > a ? 0 : a;
            alpha = 1 < a ? 1 : a;
        };

        this.getRgbaColor = function() {
            return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
        };

        this.getRgbColor = function() {
            return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
        };

        this.getHexColor = function() {
            return '#' + red.toString(16) + green.toString(16) + blue.toString(16);
        };
    };

    var conicalGradient = function(fractions, colors, rotationOffset) {

        rotationOffset = (rotationOffset === undefined ? -Math.PI / 2 : rotationOffset);

        this.fill = function(ctx, centerX, centerY, innerX, outerX) {

            var TWO_PI = 2 * Math.PI;
            var startAngle;
            var stopAngle;
            var RAD_FACTOR = 180 / Math.PI;
            var radius = innerX + (outerX - innerX) * 0.5;
            var angleStep = TWO_PI / Math.max(360, outerX * 2.2);
            ctx.save();
            ctx.lineWidth = 1.5;
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            ctx.translate(-centerX, -centerY);
            for (var i = 0, size = fractions.length - 1; i < size; i++) {
                startAngle = TWO_PI * fractions[i];
                stopAngle = TWO_PI * fractions[i + 1];
                range = stopAngle - startAngle;
                startColor = colors[i];
                stopColor = colors[i + 1];
                for (var angle = startAngle; angle < stopAngle; angle += angleStep) {
                    ctx.beginPath();
                    ctx.fillStyle = getColorFromFraction(startColor, stopColor, range, (angle - startAngle)).getRgbaColor();
                    ctx.strokeStyle = ctx.fillStyle;
                    if (innerX > 0) {
                        ctx.arc(centerX, centerY, innerX, angle + angleStep, angle, true);
                    } else {
                        ctx.moveTo(centerX, centerY);
                    }
                    ctx.arc(centerX, centerY, outerX, angle, angle + angleStep);
                    ctx.fill();
                    ctx.stroke();
                }
            }
            ctx.restore();
        };
    };

    var gradientWrapper = function(start, end, fractions, colors) {

        this.getColorAt = function(fraction) {
            fraction = (fraction < 0 ? 0 : (fraction > 1 ? 1 : fraction));
            var lowerLimit = 0;
            var lowerIndex = 0;
            var upperLimit = 1;
            var upperIndex = 1;
            var index = 0;
            var i;

            for (i = 0; i < fractions.length; i++) {
                if (fractions[i] < fraction && lowerLimit < fractions[i]) {
                    lowerLimit = fractions[i];
                    lowerIndex = i;
                }
                if (fractions[i] == fraction) {
                    return colors[i];
                }
                if (fractions[i] > fraction && upperLimit >= fractions[i]) {
                    upperLimit = fractions[i];
                    upperIndex = i;
                }
            }
            var interpolationFraction = (fraction - lowerLimit) / (upperLimit - lowerLimit);
            return getColorFromFraction(colors[lowerIndex], colors[upperIndex], 1, interpolationFraction);
        };

        this.getStart = function() {
            return start;
        };

        this.getEnd = function() {
            return end;
        };

    };

// Not currently used
/*
    var contourGradient = function(ctx, startX, startY, endX, endY, fractions, colors) {
        var width = Math.round(endX - startX);
        var height = endY - startY;
        // var sector_A = createBuffer(width, height);
        // var ctxSector_A = sector_A.getContext('2d');
        // var sector_B = createBuffer(width, height);
        // var ctxSector_B = sector_B.getContext('2d');
        // var sector_C = createBuffer(width, height);
        // var ctxSector_C = sector_C.getContext('2d');
        // var sector_D = createBuffer(width, height);
        // var ctxSector_D = sector_D.getContext('2d');

        // function prepareColorLookup() {
            // var size = (width <= height ? width / 2 : height / 2);
            // var tmpColorLookup = [];
            // var relativeValue;
            // for (var colorIndex = 0; colorIndex < colors.length - 1; colorIndex++) {
                // relativeValue = 0;
                // for (var value = fractions[colorIndex] * size; value < fractions[colorIndex + 1] * size; value++) {
                    // tmpColorLookup.add(getColorFromFraction(colors[colorIndex], colors[colorIndex + 1], (fractions[colorIndex + 1] - fractions[colorIndex]) * size, relativeValue));
                    // relativeValue++;
                // }
            // }
            // return tmpColorLookup;
        // }

        this.paintContext = function() {
            var p1 = [];
            var p2 = [];
            var grad, i;

            if (width > height) {
                p1[0] = startX + height / 2;
                p1[1] = startY + height / 2;
                p2[0] = startX + width - height / 2;
                p2[1] = startY + height / 2;
            } else if (width < height) {
                p1[0] = Math.round(startX + width / 2);
                p1[1] = Math.round(startY + width / 2);
                p2[0] = Math.round(startY + width / 2);
                p2[1] = Math.round(height - width / 2 - startX);
            } else {
                p1[0] = startX + width / 2;
                p1[1] = startY + width / 2;
                p2 = p1;
            }

            // Definition of the 4 sectors
// Changed to draw driectly on the canvas
            // ctxSector_A.beginPath();
            // ctxSector_A.moveTo(0, height);
            // ctxSector_A.lineTo(p1[0], p2[1]);
            // ctxSector_A.lineTo(p1[0], p1[1]);
            // ctxSector_A.lineTo(0, 0);
            // ctxSector_A.closePath();
            // grad = ctxSector_A.createLinearGradient(0, 0, p1[1], 0);
            // for (i = 0; i < fractions.length; i++) {
                // grad.addColorStop(fractions[i], colours[i]);
            // }
            // ctxSector_A.fillStyle = grad;
            // ctxSector_A.fill();

            // ctxSector_B.beginPath();
            // ctxSector_B.moveTo(0, 0);
            // ctxSector_B.lineTo(p1[0], p1[1]);
            // ctxSector_B.lineTo(p2[0], p1[1]);
            // ctxSector_B.lineTo(width, 0);
            // ctxSector_B.closePath();
            // grad = ctxSector_B.createLinearGradient(0, 0, 0, p1[1]);
            // for (i = 0; i < fractions.length; i++) {
                // grad.addColorStop(fractions[i], colours[i]);
            // }
            // ctxSector_B.fillStyle = grad;
            // ctxSector_B.fill();

            // ctxSector_C.beginPath();
            // ctxSector_C.moveTo(width, 0);
            // ctxSector_C.lineTo(p2[0], p1[1]);
            // ctxSector_C.lineTo(p2[0], p2[1]);
            // ctxSector_C.lineTo(width, height);
            // ctxSector_C.closePath();
            // grad = ctxSector_C.createLinearGradient(width, 0, p2[0], 0);
            // for (i = 0; i < fractions.length; i++) {
                // grad.addColorStop(fractions[i], colours[i]);
            // }
            // ctxSector_C.fillStyle = grad;
            // ctxSector_C.fill();

            // ctxSector_D.beginPath();
            // ctxSector_D.moveTo(width, height);
            // ctxSector_D.lineTo(p2[0], p2[1]);
            // ctxSector_D.lineTo(p1[0], p2[1]);
            // ctxSector_D.lineTo(0, width);
            // ctxSector_D.closePath();
            // grad = ctxSector_D.createLinearGradient(0, height, 0, p1[1]);
            // for (i = 0; i < fractions.length; i++) {
                // grad.addColorStop(fractions[i], colours[i]);
            // }
            // ctxSector_D.fillStyle = grad;
            // ctxSector_D.fill();

            // Draw the 4 sectors directly on canvas
            ctx.lineWidth = 0;
            ctx.beginPath();
            ctx.moveTo(startX, startY + height);
            ctx.lineTo(p1[0], p2[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(startX, startY);
            ctx.closePath();
            grad = ctx.createLinearGradient(startX, startY, p1[1], startY);
            for (i = 0; i < fractions.length; i++) {
                grad.addColorStop(fractions[i], colors[i].getRgbaColor());
            }
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p1[1]);
            ctx.lineTo(startX + width, startY);
            ctx.closePath();
            grad = ctx.createLinearGradient(startX, startY, startX, p1[1]);
            for (i = 0; i < fractions.length; i++) {
                grad.addColorStop(fractions[i], colors[i].getRgbaColor());
            }
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(startX + width, startY);
            ctx.lineTo(p2[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.lineTo(startX + width, startY + height);
            ctx.closePath();
            grad = ctx.createLinearGradient(startX + width, startY, p2[0], startY);
            for (i = 0; i < fractions.length; i++) {
                grad.addColorStop(fractions[i], colors[i].getRgbaColor());
            }
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(startX + width, startY + height);
            ctx.lineTo(p2[0], p2[1]);
            ctx.lineTo(p1[0], p2[1]);
            ctx.lineTo(startX, startY + height);
            ctx.closePath();
            grad = ctx.createLinearGradient(startX, startY + height, startX, p2[1]);
            for (i = 0; i < fractions.length; i++) {
                grad.addColorStop(fractions[i], colors[i].getRgbaColor());
            }
            ctx.fillStyle = grad;
            ctx.fill();
        };

    };
*/

    function setAlpha(hex, alpha) {
        var hexColor = ("#" === hex.charAt(0)) ? hex.substring(1, 7) : hex;
        var red = parseInt((hexColor).substring(0, 2), 16);
        var green = parseInt((hexColor).substring(2, 4), 16);
        var blue = parseInt((hexColor).substring(4, 6), 16);

        this.color = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';

        return this;
    }

    function getColorFromFraction(sourceColor, destinationColor, range, fraction) {
        var INT_TO_FLOAT = 1 / 255;
        var sourceRed = sourceColor.getRed();
        var sourceGreen = sourceColor.getGreen();
        var sourceBlue = sourceColor.getBlue();
        var sourceAlpha = sourceColor.getAlpha();

        var deltaRed = destinationColor.getRed() - sourceColor.getRed();
        var deltaGreen = destinationColor.getGreen() - sourceColor.getGreen();
        var deltaBlue = destinationColor.getBlue() - sourceColor.getBlue();
        var deltaAlpha = destinationColor.getAlpha() * INT_TO_FLOAT - sourceColor.getAlpha() * INT_TO_FLOAT;

        var fractionRed = deltaRed / range;
        var fractionGreen = deltaGreen / range;
        var fractionBlue = deltaBlue / range;
        var fractionAlpha = deltaAlpha / range;

        return new rgbaColor((sourceRed + fractionRed * fraction).toFixed(0), (sourceGreen + fractionGreen * fraction).toFixed(0), (sourceBlue + fractionBlue * fraction).toFixed(0), sourceAlpha + fractionAlpha * fraction);
    }

    function section(start, stop, color) {
        return {
            start : start,
            stop : stop,
            color : color
        };
    }

    Math.log10 = function(value) {
        return (Math.log(value) / Math.LN10);
    };

    function calcNiceNumber(range, round) {
        var exponent = Math.floor(Math.log10(range));   // exponent of range
        var fraction = range / Math.pow(10, exponent);  // fractional part of range
        var niceFraction; // nice, rounded fraction

        if (round) {
            if (1.5 > fraction) {
                niceFraction = 1;
            } else if (3 > fraction) {
                niceFraction = 2;
            } else if (7 > fraction) {
                niceFraction = 5;
            } else {
                niceFraction = 10;
            }
        } else {
            if (1 >= fraction) {
                niceFraction = 1;
            } else if (2 >= fraction) {
                niceFraction = 2;
            } else if (5 >= fraction) {
                niceFraction = 5;
            } else {
                niceFraction = 10;
            }
        }
        return niceFraction * Math.pow(10, exponent);
    }

    function roundedRectangle(ctx, x, y, w, h, radius) {
        var r = x + w;
        var b = y + h;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(r - radius, y);
        ctx.quadraticCurveTo(r, y, r, y + radius);
        ctx.lineTo(r, y+h-radius);
        ctx.quadraticCurveTo(r, b, r - radius, b);
        ctx.lineTo(x + radius, b);
        ctx.quadraticCurveTo(x, b, x, b - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
    }

    function createBuffer(width, height) {
        var buffer = doc.createElement('canvas');
        buffer.width = width;
        buffer.height = height;
        return buffer;
    }

    function drawToBuffer(width, height, drawFunction) {
        var buffer = doc.createElement('canvas');
        buffer.width = width;
        buffer.height = height;
        drawFunction(buffer.getContext('2d'));
        return buffer;
    }

    function getColorValues(color) {
        var colorData;
        var lookupBuffer = drawToBuffer(1, 1, function(ctx) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.rect(0, 0, 1, 1);
            ctx.fill();
        });
        colorData = lookupBuffer.getContext('2d').getImageData(0, 0, 2, 2).data;

        /*
        for (var i = 0; i < data.length; i += 4) {
            var red = data[i];       // red
            var green = data[i + 1]; // green
            var blue = data[i + 2];  // blue
            //var alpha = data[i + 3]; // alpha
            console.log(red + ", " + green + ", " + blue);
        }
        */

        return [colorData[0], colorData[1], colorData[2], colorData[3]];
    }

    function customColorDef(color) {
        var VERY_DARK;
        var DARK;
        var LIGHT;
        var LIGHTER;
        var VERY_LIGHT;

        var values = getColorValues(color);
        var rgbaCol = new rgbaColor(values[0], values[1], values[2], values[3]);
        VERY_DARK = darker(rgbaCol, 0.32);
        DARK = darker(rgbaCol, 0.62);
        LIGHT = lighter(rgbaCol, 0.84);
        LIGHTER = lighter(rgbaCol, 0.94);
        VERY_LIGHT = lighter(rgbaCol, 1);

        return new colorDef(VERY_DARK, DARK, rgbaCol, LIGHT, LIGHTER, VERY_LIGHT);
    }

    function rgbToHsl(red, green, blue) {
        red /= 255;
        green /= 255;
        blue /= 255;

        var max = Math.max(red, green, blue);
        var min = Math.min(red, green, blue);
        var hue;
        var saturation;
        var lightness = (max + min) / 2;

        if (max === min) {
            hue = saturation = 0; // achromatic
        } else {
            var delta = max - min;
            saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
            switch (max) {
                case red:
                    hue = (green - blue) / delta + (green < blue ? 6 : 0);
                    break;
                case green:
                    hue = (blue - red) / delta + 2;
                    break;
                case blue:
                    hue = (red - green) / delta + 4;
                    break;
            }
            hue /= 6;
        }
        return [hue, saturation, lightness];
    }

    function hslToRgb(hue, saturation, lightness){
        var red;
        var green;
        var blue;

        function hue2rgb(p, q, t) {
            if(t < 0) {t += 1;}
            if(t > 1) {t -= 1;}
            if(t < 1/6) {
                return p + (q - p) * 6 * t;
            }
            if(t < 1/2) {
                return q;
            }
            if(t < 2/3) {
                return p + (q - p) * (2/3 - t) * 6;
            }
            return p;
        }

    if (saturation === 0) {
        red = green = blue = lightness; // achromatic
    } else {
        var q = (lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation);
        var p = 2 * lightness - q;
        red = hue2rgb(p, q, hue + 1/3);
        green = hue2rgb(p, q, hue);
        blue = hue2rgb(p, q, hue - 1/3);
    }

    return [Math.floor(red * 255), Math.floor(green * 255), Math.floor(blue * 255)];
}

    function hsbToHsl(hue, saturation, brightness) {
        var lightness = (brightness - saturation) / 2;
        lightness = (lightness > 1 ? 1 : (lightness < 0 ? 0 : lightness));
        return [hue, saturation, lightness];
    }

    function hslToHsb(hue, saturation, lightness) {
        var brightness = (lightness * 2) + saturation;
        return [hue, saturation, brightness];
    }

    function hsb2Rgb(hue, saturation, brightness) {
        var r, g, b;
        var i = Math.floor(hue * 6);
        var f = hue * 6 - i;
        var p = brightness * (1 - saturation);
        var q = brightness * (1 - f * saturation);
        var t = brightness * (1 - (1 - f) * saturation);

        switch(i % 6){
            case 0:
                r = brightness;
                g = t
                b = p;
                break;
            case 1:
                r = q
                g = brightness;
                b = p;
                break;
            case 2:
                r = p;
                g = brightness;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = brightness;
                break;
            case 4:
                r = t;
                g = p;
                b = brightness;
                break;
            case 5:
                r = brightness;
                g = p;
                b = q;
                break;
        }

        return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
    }
    function rgbToHsb(r, g, b){
        r = r/255;
        g = g/255;

        b = b/255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var hue;
        var saturation;
        var brightness = max;
        var delta = max - min;
        saturation = max == 0 ? 0 : delta / max;

        if(max == min) {
            hue = 0; // achromatic
        } else {
            switch(max){
                case r:
                    hue = (g - b) / delta + (g < b ? 6 : 0);
                    break;
                case g:
                    hue = (b - r) / delta + 2;
                    break;
                case b:
                    hue = (r - g) / delta + 4;
                    break;
            }
            hue /= 6;
        }
        return [hue, saturation, brightness];
    }
    function darker(color, fraction) {
        var red = Math.floor(color.getRed() * (1 - fraction));
        var green = Math.floor(color.getGreen() * (1 - fraction));
        var blue = Math.floor(color.getBlue() * (1 - fraction));

        red = (red < 0 ? 0 : (red > 255 ? 255 : red));
        green = (green < 0 ? 0 : (red > 255 ? 255 : green));
        blue = (blue < 0 ? 0 : (blue > 255 ? 255 : blue));

        return new rgbaColor(red, green, blue, color.getAlpha());
    }

    function lighter(color, fraction) {
        var red = Math.round(color.getRed() * (1 + fraction));
        var green = Math.round(color.getGreen() * (1 + fraction));
        var blue = Math.round(color.getBlue() * (1 + fraction));

        red = (red < 0 ? 0 : (red > 255 ? 255 : red));
        green = (green < 0 ? 0 : (red > 255 ? 255 : green));
        blue = (blue < 0 ? 0 : (blue > 255 ? 255 : blue));

        return new rgbaColor(red, green, blue, color.getAlpha());
    }

    function wrap(value, lower, upper) {
        if (upper <= lower) {
            throw "Rotary bounds are of negative or zero size";
        }

        var distance = upper - lower;
        var times = Math.floor((value - lower) / distance);

        return value - (times * distance);
    }

    function getShortestAngle(angle1, angle2) {
        return wrap((angle2 - angle1), -180, 180);
    }

    function blur(ctx, width, height, radius) {
        // Cheap'n'cheerful blur filter, just applies horizontal and vertical blurs
        // Only works for square canvas's at present
        ctx.save();
        // Create a temporary buffer
        var tempBuffer = createBuffer(width, height);
        var tempCtx = tempBuffer.getContext('2d');

        // Get access to the pixel data
        var inPix;
        var outPix; // = ctx.createImageData(width, height);

        for (var j = 0; j < 2; j++) {
            // Get access to the pixel data
            inPix = ctx.getImageData(0, 0, (j === 0 ? width : height), (j === 0 ? height : width));
            outPix = ctx.createImageData((j === 0 ? width : height), (j === 0 ? height : width));

            if (j === 0) { // Horizontal blur
                if (radius >= width) {
                    radius = width - 1;
                }
            } else { // Vertical blur
                if (radius >= height) {
                    radius = height - 1;
                }
            }
            var mul = 1 / (radius * 2 + 1);
            var indx = 0;
            for (var y = 0; y < (j === 0 ? height : width); y++) {
                var totR = 0;
                var totG = 0;
                var totB = 0;
                var totA = 0;
                for (var x = 0; x < radius ; x++) {
                    var i = (indx + x) * 4;
                    totR += inPix.data[i];
                    totG += inPix.data[i + 1];
                    totB += inPix.data[i + 2];
                    totA += inPix.data[i + 3];
                }
                for (var x = 0; x < (j === 0 ? width : height); x++) {
                    if (x > radius) {
                        var i = (indx - radius - 1) * 4;
                        totR -= inPix.data[i];
                        totG -= inPix.data[i + 1];
                        totB -= inPix.data[i + 2];
                        totA -= inPix.data[i + 3];
                    }
                    if (x + radius < width) {
                        var i = (indx + radius) * 4;
                        totR += inPix.data[i];
                        totG += inPix.data[i + 1];
                        totB += inPix.data[i + 2];
                        totA += inPix.data[i + 3];
                    }
                    var i = indx * 4;
                    outPix.data[i] = (totR * mul) | 0;
                    outPix.data[i + 1] = (totG * mul) | 0;
                    outPix.data[i + 2] = (totB * mul) | 0;
                    outPix.data[i + 3] = (totA * mul) | 0;
                    indx++;
                }
            }
            // Write the output pixel data back to the temp buffer
            tempCtx.clearRect(0, 0, width, height);
            tempCtx.putImageData(outPix, 0, 0);
            if (j === 0) {
                // Clear the input canvas
                ctx.clearRect(0, 0, width, height);
                // Rotate image by 90 degrees
                ctx.translate(width / 2, height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.translate(-width / 2, -height / 2);
                // Write the buffer back
                ctx.drawImage(tempBuffer, 0, 0);
            }
        }
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI);
        ctx.translate(-width / 2, -height / 2);
        // Clear the input canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempBuffer, 0, 0);
        ctx.restore();
    }

    //****************************************   C O N S T A N T S   ***************************************************
    var backgroundColorDef;
    (function() {
        backgroundColorDef = function(gradientStart, gradientFraction, gradientStop, labelColor, symbolColor) {
            this.gradientStart = gradientStart;
            this.gradientFraction = gradientFraction;
            this.gradientStop = gradientStop;
            this.labelColor = labelColor;
            this.symbolColor = symbolColor;
        };
    }());

    var lcdColorDef;
    (function() {
        lcdColorDef = function(gradientStartColor, gradientFraction1Color, gradientFraction2Color, gradientFraction3Color, gradientStopColor, textColor) {
            this.gradientStartColor = gradientStartColor;
            this.gradientFraction1Color = gradientFraction1Color;
            this.gradientFraction2Color = gradientFraction2Color;
            this.gradientFraction3Color = gradientFraction3Color;
            this.gradientStopColor = gradientStopColor;
            this.textColor = textColor;
        };
    }());

    var colorDef;
    (function() {
        colorDef = function(veryDark, dark, medium, light, lighter, veryLight) {
            this.veryDark = veryDark;
            this.dark = dark;
            this.medium = medium;
            this.light = light;
            this.lighter = lighter;
            this.veryLight = veryLight;
        };
    }());

    var ledColorDef;
    (function() {
        ledColorDef = function(innerColor1_ON, innerColor2_ON, outerColor_ON, coronaColor, innerColor1_OFF, innerColor2_OFF, outerColor_OFF) {
            this.innerColor1_ON = innerColor1_ON;
            this.innerColor2_ON = innerColor2_ON;
            this.outerColor_ON = outerColor_ON;
            this.coronaColor = coronaColor;
            this.innerColor1_OFF = innerColor1_OFF;
            this.innerColor2_OFF = innerColor2_OFF;
            this.outerColor_OFF = outerColor_OFF;
        };
    }());

    var gaugeTypeDef;
    (function() {
        gaugeTypeDef = function(type) {
            this.type = type;
        };
    }());

    var orientationDef;
    (function() {
        orientationDef = function(type) {
            this.type = type;
        };
    }());

    var knobTypeDef;
    (function() {
        knobTypeDef = function(type) {
            this.type = type;
        };
    }());

    var knobStyleDef;
    (function() {
        knobStyleDef = function(style) {
            this.style = style;
        };
    }());

    var frameDesignDef;
    (function() {
        frameDesignDef = function(design) {
            this.design = design;
        };
    }());

    var pointerTypeDef;
    (function() {
        pointerTypeDef = function(type) {
            this.type = type;
        };
    }());

    var foregroundTypeDef;
    (function() {
        foregroundTypeDef = function(type) {
            this.type = type;
        };
    }());

    var labelNumberFormatDef;
    (function() {
        labelNumberFormatDef = function(format) {
            this.format = format;
        };
    }());

    var tickLabelOrientationDef;
    (function() {
        tickLabelOrientationDef = function(type) {
            this.type = type;
        };
    }());

    var trendStateDef;
    (function() {
        trendStateDef = function(state) {
            this.state = state;
        };
    }());

    //*************************   I m p l e m e n t a t i o n s   o f   d e f i n i t i o n s   ************************
    var backgroundColor = {
        DARK_GRAY: new backgroundColorDef(new rgbaColor(0,0,0, 1), new rgbaColor(51, 51, 51, 1), new rgbaColor(153, 153, 153, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(180, 180, 180, 1)),
        SATIN_GRAY: new backgroundColorDef(new rgbaColor(45, 57, 57, 1), new rgbaColor(45, 57, 57, 1), new rgbaColor(45, 57, 57, 1), new rgbaColor(167, 184, 180, 1), new rgbaColor(137, 154, 150, 1)),
        LIGHT_GRAY: new backgroundColorDef(new rgbaColor(130, 130, 130, 1), new rgbaColor(181, 181, 181, 1), new rgbaColor(253, 253, 253, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        WHITE: new backgroundColorDef(new rgbaColor(255, 255, 255, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        BLACK: new backgroundColorDef(new rgbaColor(0, 0, 0, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(150, 150, 150, 1)),
        BEIGE: new backgroundColorDef(new rgbaColor(178, 172, 150, 1), new rgbaColor(204, 205, 184, 1), new rgbaColor(231, 231, 214, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        BROWN: new backgroundColorDef(new rgbaColor(245, 225, 193, 1), new rgbaColor(245, 225, 193, 1), new rgbaColor(255, 250, 240, 1), new rgbaColor(109, 73, 47, 1), new rgbaColor(89, 53, 27, 1)),
        RED: new backgroundColorDef(new rgbaColor(198, 93, 95, 1), new rgbaColor(212, 132, 134, 1), new rgbaColor(242, 218, 218, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(90, 0, 0, 1)),
        GREEN: new backgroundColorDef(new rgbaColor(65, 120, 40, 1), new rgbaColor(129, 171, 95, 1), new rgbaColor(218, 237, 202, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(0, 90, 0, 1)),
        BLUE: new backgroundColorDef(new rgbaColor(45, 83, 122, 1), new rgbaColor(115, 144, 170, 1), new rgbaColor(227, 234, 238, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(0, 0, 90, 1)),
        ANTHRACITE: new backgroundColorDef(new rgbaColor(50, 50, 54, 1), new rgbaColor(47, 47, 51, 1), new rgbaColor(69, 69, 74, 1), new rgbaColor(250, 250, 250, 1), new rgbaColor(180, 180, 180, 1)),
        MUD: new backgroundColorDef(new rgbaColor(80, 86, 82, 1), new rgbaColor(70, 76, 72, 1), new rgbaColor(57, 62, 58, 1), new rgbaColor(255, 255, 240, 1), new rgbaColor(225, 225, 210, 1)),
        PUNCHED_SHEET: new backgroundColorDef(new rgbaColor(50, 50, 54, 1), new rgbaColor(47, 47, 51, 1), new rgbaColor(69, 69, 74, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(180, 180, 180, 1)),
        CARBON: new backgroundColorDef(new rgbaColor(50, 50, 54, 1), new rgbaColor(47, 47, 51, 1), new rgbaColor(69, 69, 74, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(180, 180, 180, 1)),
        STAINLESS: new backgroundColorDef(new rgbaColor(130, 130, 130, 1), new rgbaColor(181, 181, 181, 1), new rgbaColor(253, 253, 253, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        BRUSHED_METAL: new backgroundColorDef(new rgbaColor(50, 50, 54, 1), new rgbaColor(47,47, 51, 1), new rgbaColor(69, 69, 74, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        BRUSHED_STAINLESS: new backgroundColorDef(new rgbaColor(50, 50, 54, 1), new rgbaColor(47,47, 51, 1), new rgbaColor(110, 110, 112, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1)),
        TURNED: new backgroundColorDef(new rgbaColor(130, 130, 130, 1), new rgbaColor(181, 181, 181, 1), new rgbaColor(253, 253, 253, 1), new rgbaColor(0, 0, 0, 1), new rgbaColor(80, 80, 80, 1))
    };

    var lcdColor = {
        BEIGE: new lcdColorDef('#c8c8b1', 'rgb(241, 237, 207)', 'rgb(234, 230, 194)', 'rgb(225, 220, 183)', 'rgb(237, 232, 191)', '#000000'),
        BLUE: new lcdColorDef('#ffffff', 'rgb(231, 246, 255)', 'rgb(170, 224, 255)', 'rgb(136, 212, 255)', 'rgb(192, 232, 255)', '#124564'),
        ORANGE: new lcdColorDef('#ffffff', 'rgb(255, 245, 225)', 'rgb(255, 217, 147)', 'rgb(255, 201, 104)', 'rgb(255, 227, 173)', '#503700'),
        RED: new lcdColorDef('#ffffff', 'rgb(255, 225, 225)', 'rgb(253, 152, 152)', 'rgb(252, 114, 115)', 'rgb(254, 178, 178)', '#4f0c0e'),
        YELLOW: new lcdColorDef('#ffffff', 'rgb(245, 255, 186)', 'rgb(210, 255, 0)', 'rgb(158, 205, 0)', 'rgb(210, 255, 0)', '#405300'),
        WHITE: new lcdColorDef('#ffffff', '#ffffff', 'rgb(241, 246, 242)', 'rgb(229, 239, 244)', '#ffffff', '#000000'),
        GRAY: new lcdColorDef('#414141', 'rgb(117, 117, 117)', 'rgb(87, 87, 87)', '#414141', 'rgb(81, 81, 81)', '#ffffff'),
        BLACK: new lcdColorDef('#414141', '#666666', '#333333', '#000000', '#333333', '#cccccc'),
        GREEN: new lcdColorDef('rgb(33, 67, 67)', 'rgb(33, 67, 67)', 'rgb(29, 58, 58)', 'rgb(28, 57, 57)', 'rgb(23, 46, 46)', 'rgba(0, 185, 165, 255)'),
        BLUE2: new lcdColorDef('rgb(0, 68, 103)', 'rgb(8, 109, 165)', 'rgb(0, 72, 117)', 'rgb(0, 72, 117)', 'rgb(0, 68, 103)', 'rgb(111, 182, 228)'),
        BLUE_BLACK: new lcdColorDef('rgb(22, 125, 212)', 'rgb(3, 162, 254)', 'rgb(3, 162, 254)', 'rgb(3, 162, 254)', 'rgb(11, 172, 244)', '#000000'),
        BLUE_DARKBLUE: new lcdColorDef('rgb(18, 33, 88)', 'rgb(18, 33, 88)', 'rgb(19, 30, 90)', 'rgb(17, 31, 94)', 'rgb(21, 25, 90)', 'rgb(23, 99, 221)'),
        BLUE_GRAY: new lcdColorDef('rgb(135, 174, 255)', 'rgb(101, 159, 255)', 'rgb(44, 93, 255)', 'rgb(27, 65, 254)', 'rgb(12, 50, 255)', '#b2b4ed'),
        STANDARD: new lcdColorDef('rgb(131, 133, 119)', 'rgb(176, 183, 167)', 'rgb(165, 174, 153)', 'rgb(166, 175, 156)', 'rgb(175, 184, 165)', 'rgb(35, 42, 52)'),
        STANDARD_GREEN: new lcdColorDef('#ffffff', 'rgb(219, 230, 220)', 'rgb(179, 194, 178)', 'rgb(153, 176, 151)', 'rgb(114, 138, 109)', '#080C06'),
        BLUE_BLUE: new lcdColorDef('rgb(100, 168, 253)', 'rgb(100, 168, 253)', 'rgb(95, 160, 250)', 'rgb(80, 144, 252)', 'rgb(74, 134, 255)', '#002cbb'),
        RED_DARKRED: new lcdColorDef('rgb(72, 36, 50)', 'rgb(185, 111, 110)', 'rgb(148, 66, 72)', 'rgb(83, 19, 20)', 'rgb(7, 6, 14)', '#FE8B92'),
        DARKBLUE: new lcdColorDef('rgb(14, 24, 31)', 'rgb(46, 105, 144)', 'rgb(19, 64, 96)', 'rgb(6, 20, 29)', 'rgb(8, 9, 10)', '#3DB3FF'),
        LILA: new lcdColorDef('rgb(175, 164, 255)', 'rgb(188, 168, 253)', 'rgb(176, 159, 255)', 'rgb(174, 147, 252)', 'rgb(168, 136, 233)', '#076148'),
        BLACKRED: new lcdColorDef('rgb(8, 12, 11)', 'rgb(10, 11, 13)', 'rgb(11, 10, 15)', 'rgb(7, 13, 9)', 'rgb(9, 13, 14)', '#B50026'),
        DARKGREEN: new lcdColorDef('rgb(25, 85, 0)', 'rgb(47, 154, 0)', 'rgb(30, 101, 0)', 'rgb(30, 101, 0)', 'rgb(25, 85, 0)', '#233123'),
        AMBER: new lcdColorDef('rgb(182, 71, 0)', 'rgb(236, 155, 25)', 'rgb(212, 93, 5)', 'rgb(212, 93, 5)', 'rgb(182, 71, 0)', '#593A0A'),
        LIGHTBLUE: new lcdColorDef('rgb(125, 146, 184)', 'rgb(197, 212, 231)', 'rgb(138, 155, 194)', 'rgb(138, 155, 194)', 'rgb(125, 146, 184)', '#090051'),
        SECTIONS: new lcdColorDef('#b2b2b2', '#ffffff', '#c4c4c4', '#c4c4c4', '#b2b2b2', '#000000')
    };

    var color = {
        RED: new colorDef(new rgbaColor(82, 0, 0, 1), new rgbaColor(158, 0, 19, 1), new rgbaColor(213, 0, 25, 1), new rgbaColor(240, 82, 88, 1), new rgbaColor(255, 171, 173, 1), new rgbaColor(255, 217, 218, 1)),
        GREEN: new colorDef(new rgbaColor(8, 54, 4, 1), new rgbaColor(0, 107, 14, 1), new rgbaColor(15, 148, 0, 1), new rgbaColor(121, 186, 37, 1), new rgbaColor(190, 231, 141, 1), new rgbaColor(234, 247, 218, 1)),
        BLUE: new colorDef(new rgbaColor(0, 11, 68, 1), new rgbaColor(0, 73, 135, 1), new rgbaColor(0, 108, 201, 1), new rgbaColor(0, 141, 242, 1), new rgbaColor(122, 200, 255, 1), new rgbaColor(204, 236, 255, 1)),
        ORANGE: new colorDef(new rgbaColor(118, 83, 30, 1), new rgbaColor(215, 67, 0, 1), new rgbaColor(240, 117, 0, 1), new rgbaColor(255, 166, 0, 1), new rgbaColor(255, 255, 128, 1), new rgbaColor(255, 247, 194, 1)),
        YELLOW: new colorDef(new rgbaColor(41, 41, 0, 1), new rgbaColor(102, 102, 0, 1), new rgbaColor(177, 165, 0, 1), new rgbaColor(255, 242, 0, 1), new rgbaColor(255, 250, 153, 1), new rgbaColor(255, 252, 204, 1)),
        CYAN: new colorDef(new rgbaColor(15, 109, 109, 1), new rgbaColor(0, 109, 144, 1), new rgbaColor(0, 144, 191, 1), new rgbaColor(0, 174, 239, 1), new rgbaColor(153, 223, 249, 1), new rgbaColor(204, 239, 252, 1)),
        MAGENTA: new colorDef(new rgbaColor(98, 0, 114, 1), new rgbaColor(128, 24, 72, 1), new rgbaColor(191, 36, 107, 1), new rgbaColor(255, 48, 143, 1), new rgbaColor(255, 172, 210, 1), new rgbaColor(255, 214, 23, 1)),
        WHITE: new colorDef(new rgbaColor(210, 210, 210, 1), new rgbaColor(220, 220, 220, 1), new rgbaColor(235, 235, 235, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(255, 255, 255, 1), new rgbaColor(255, 255, 255, 1)),
        GRAY: new colorDef(new rgbaColor(25, 25, 25, 1), new rgbaColor(51, 51, 51, 1), new rgbaColor(76, 76, 76, 1), new rgbaColor(128, 128, 128, 1), new rgbaColor(204, 204, 204, 1), new rgbaColor(243, 243, 243, 1)),
        BLACK: new colorDef(new rgbaColor(0, 0, 0, 1), new rgbaColor(5, 5, 5, 1), new rgbaColor(10, 10, 10, 1), new rgbaColor(15, 15, 15, 1), new rgbaColor(20, 20, 20, 1), new rgbaColor(25, 25, 25, 1)),
        RAITH: new colorDef(new rgbaColor(0, 32, 65, 1), new rgbaColor(0, 65, 125, 1), new rgbaColor(0, 106, 172, 1), new rgbaColor(130, 180, 214, 1), new rgbaColor(148, 203, 242, 1), new rgbaColor(191, 229, 255, 1)),
        GREEN_LCD: new colorDef(new rgbaColor(0, 55, 45, 1), new rgbaColor(15, 109, 93, 1), new rgbaColor(0, 185, 165, 1), new rgbaColor(48, 255, 204, 1), new rgbaColor(153, 255, 227, 1), new rgbaColor(204, 255, 241, 1)),
        JUG_GREEN: new colorDef(new rgbaColor(0, 56, 0, 1), new rgbaColor(32, 69, 36, 1), new rgbaColor(50, 161, 0, 1), new rgbaColor(129, 206, 0, 1), new rgbaColor(190, 231, 141, 1), new rgbaColor(234, 247, 218, 1))
    };

    var ledColor = {
        RED_LED: new ledColorDef('#FF9A89', '#FF9A89', '#FF3300', '#FF8D70', '#7E1C00', '#7E1C00', '#641B00'),
        GREEN_LED: new ledColorDef('#9AFF89', '#9AFF89', '#59FF2A', '#A5FF00', '#1C7E00', '#1C7E00', '#1B6400'),
        BLUE_LED: new ledColorDef('#899AFF', '#899AFF', '#0033FF', '#708DFF', '#001C7E', '#001C7E', '#001B64'),
        ORANGE_LED: new ledColorDef('#FEA23F', '#FEA23F', '#FD6C00', '#FD6C00', '#592800', '#592800', '#421F00'),
        YELLOW_LED: new ledColorDef('#FFFF62', '#FFFF62', '#FFFF00', '#FFFF00', '#6B6D00', '#6B6D00', '#515300'),
        CYAN_LED: new ledColorDef('#00FFFF', '#00FFFF', '#1BC3C3', '#00FFFF', '#083B3B', '#083B3B', '#052727'),
        MAGENTA_LED: new ledColorDef('#D300FF', '#D300FF', '#8600CB', '#C300FF', '#38004B', '#38004B', '#280035')
    };

    var gaugeType = {
        TYPE1: new gaugeTypeDef('type1'),
        TYPE2: new gaugeTypeDef('type2'),
        TYPE3: new gaugeTypeDef('type3'),
        TYPE4: new gaugeTypeDef('type4'),
        TYPE5: new gaugeTypeDef('type5')
    };

    var orientation = {
        NORTH: new orientationDef('north'),
        SOUTH: new orientationDef('south'),
        EAST: new orientationDef('east'),
        WEST: new orientationDef('west')
    };

    var knobType = {
        STANDARD_KNOB: new knobTypeDef('standardKnob'),
        METAL_KNOB: new knobTypeDef('metalKnob')
    };

    var knobStyle = {
        BLACK: new knobStyleDef('black'),
        BRASS: new knobStyleDef('brass'),
        SILVER: new knobStyleDef('silver')
    };

    var frameDesign = {
        BLACK_METAL: new frameDesignDef('blackMetal'),
        METAL: new frameDesignDef('metal'),
        SHINY_METAL: new frameDesignDef('shinyMetal'),
        BRASS: new frameDesignDef('brass'),
        STEEL: new frameDesignDef('steel'),
        CHROME: new frameDesignDef('chrome'),
        GOLD: new frameDesignDef('gold'),
        ANTHRACITE: new frameDesignDef('anthracite'),
        TILTED_GRAY: new frameDesignDef('tiltedGray'),
        TILTED_BLACK: new frameDesignDef('tiltedBlack'),
        GLOSSY_METAL: new frameDesignDef('glossyMetal')
    };

    var pointerType = {
        TYPE1: new pointerTypeDef('type1'),
        TYPE2: new pointerTypeDef('type2'),
        TYPE3: new pointerTypeDef('type3'),
        TYPE4: new pointerTypeDef('type4'),
        TYPE5: new pointerTypeDef('type5'),
        TYPE6: new pointerTypeDef('type6'),
        TYPE7: new pointerTypeDef('type7'),
        TYPE8: new pointerTypeDef('type8'),
        TYPE9: new pointerTypeDef('type9'),
        TYPE10: new pointerTypeDef('type10'),
        TYPE11: new pointerTypeDef('type11'),
        TYPE12: new pointerTypeDef('type12'),
        TYPE13: new pointerTypeDef('type13'),
        TYPE14: new pointerTypeDef('type14'),
        TYPE15: new pointerTypeDef('type15'),
        TYPE16: new pointerTypeDef('type16')
    };

    var foregroundType = {
        TYPE1: new foregroundTypeDef('type1'),
        TYPE2: new foregroundTypeDef('type2'),
        TYPE3: new foregroundTypeDef('type3'),
        TYPE4: new foregroundTypeDef('type4'),
        TYPE5: new foregroundTypeDef('type5')
    };

    var labelNumberFormat = {
        STANDARD: new labelNumberFormatDef('standard'),
        FRACTIONAL: new labelNumberFormatDef('fractional'),
        SCIENTIFIC: new labelNumberFormatDef('scientific')
    };

    var tickLabelOrientation = {
        NORMAL: new tickLabelOrientationDef('normal'),
        HORIZONTAL: new tickLabelOrientationDef('horizontal'),
        TANGENT: new tickLabelOrientationDef('tangent')
    };

    var trendState = {
        UP: new trendStateDef('up'),
        STEADY: new trendStateDef('steady'),
        DOWN: new trendStateDef('down'),
        OFF: new trendStateDef('off')
    };

    //**********************************   E X P O R T   F U N C T I O N S   *******************************************
    return {
        // Components EXTERNAL : INTERNAL
        Radial : radial,
        RadialBargraph : radialBargraph,
        RadialVertical : radialVertical,
        Linear: linear,
        LinearBargraph: linearBargraph,
        DisplaySingle: displaySingle,
        DisplayMulti: displayMulti,
        Level : level,
        Compass : compass,
        WindDirection : windDirection,
        Horizon : horizon,
        Led : led,
        Clock : clock,
        Battery : battery,
        StopWatch : stopwatch,
        Altimeter : altimeter,
        TrafficLight: trafficlight,
        LightBulb: lightbulb,

        // Images
        drawFrame : drawRadialFrameImage,
        drawBackground : drawRadialBackgroundImage,
        drawForeground : drawRadialForegroundImage,

        // Tools
        rgbaColor :  rgbaColor,
        conicalGradient : conicalGradient,
        setAlpha : setAlpha,
        getColorFromFraction : getColorFromFraction,
        gradientWrapper : gradientWrapper,

        // Constants
        BackgroundColor : backgroundColor,
        LcdColor : lcdColor,
        ColorDef : color,
        LedColor : ledColor,
        GaugeType : gaugeType,
        Orientation: orientation,
        FrameDesign : frameDesign,
        PointerType : pointerType,
        ForegroundType : foregroundType,
        KnobType : knobType,
        KnobStyle: knobStyle,
        LabelNumberFormat: labelNumberFormat,
        TickLabelOrientation: tickLabelOrientation,
        TrendState: trendState,

        // Other
        Section : section
    };
}();

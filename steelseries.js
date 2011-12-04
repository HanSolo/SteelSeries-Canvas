/*!
 * Name          : steelseries.js
 * Author        : Gerrit Grunwald, Mark Crossley
 * Last modified : 04.12.2011
 * Revision      : 0.8.3
 */

var steelseries = function() {
    var doc = document;

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
        var labelNumberFormat = (undefined === parameters.labelNumberFormat ? steelseries.LabelNumberFormat.STANDARD : parameters.labelNumberFormat);
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);
        var customLayer = (undefined === parameters.customLayer ? null : parameters.customLayer);

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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

        // Misc
        var ledPosX = 0.6 * imageWidth;
        var ledPosY = 0.4 * imageHeight;
        var stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
        var lcdFont = Math.floor(imageWidth / 10) + 'px LCDMono2Ultra';
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
            }
            else {
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
                    rotationOffset = (1.5 * Math.PI) - HALF_PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = HALF_PI;
                    angleStep = angleRange / range;
                    break;

                case 'type2':
                    freeAreaAngle = 0;
                    rotationOffset = (1.5 * Math.PI) - HALF_PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type3':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI - HALF_PI;
                    tickmarkOffset = 0;
                    angleRange = 1.5 * Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type4':
                default:
                    freeAreaAngle = 60 * RAD_FACTOR;
                    rotationOffset = Math.PI + (freeAreaAngle / 2.0) - HALF_PI;
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
        var ledBufferOn = createBuffer(size * 0.0934579439, size * 0.0934579439);
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(size * 0.0934579439, size * 0.0934579439);
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.0280373832), Math.ceil(size * 0.0280373832));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.0280373832), Math.ceil(size * 0.0280373832));
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
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            //var valueWidth = mainCtx.measureText(value).width;
            mainCtx.fillText(value.toFixed(lcdDecimals), (imageWidth + (imageWidth * 0.4)) / 2 - 2, imageWidth * 0.63, imageWidth * 0.4);
            //var unitWidth = mainCtx.measureText(unitString).width;
            //mainCtx.fillText(unitString, (imageWidth - unitWidth) / 2.0, imageHeight * 0.38, imageWidth * 0.2);

            mainCtx.restore();
        };

        var drawPostsImage = function(ctx) {
            ctx.save();

            if ('type1' === gaugeType.type) {
                // Draw max center top post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.5233644843101501, imageHeight * 0.13084112107753754);
            }

            if ('type1' === gaugeType.type || 'type2' === gaugeType.type) {
                // Draw min left post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.13084112107753754, imageHeight * 0.514018714427948);
            }

            if ('type2' === gaugeType.type || 'type3' === gaugeType.type) {
                // Draw max right post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.8317757248878479, imageHeight * 0.514018714427948);
            }

            if ('type3' === gaugeType.type) {
                // Draw min center bottom post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.5233644843101501, imageHeight * 0.8317757248878479);
            }

            if ('type4' === gaugeType.type) {
                // Min post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.336448609828949, imageHeight * 0.8037382960319519);

                // Max post
                ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.6261682510375977, imageHeight * 0.8037382960319519);
            }

            ctx.restore();

        };

        var createThresholdImage = function() {
            var thresholdBuffer = doc.createElement('canvas');
            thresholdBuffer.width = Math.ceil(size * 0.046728972);
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0.0, 'rgb(82, 0, 0)');
            gradThreshold.addColorStop(0.3, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(0.59, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(1.0, 'rgb(82, 0, 0)');
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
            ctx.moveTo(0, 0);
            ctx.closePath();
            if (filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }

            ctx.translate(-centerX, -centerY);
            ctx.restore();
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1.0);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
//            var fontSize = imageWidth * 0.04;
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

            var OUTER_POINT = imageWidth * 0.38;
            var MAJOR_INNER_POINT = imageWidth * 0.35;
            var MED_INNER_POINT = imageWidth * 0.355;
            var MINOR_INNER_POINT = imageWidth * 0.36;
            var TEXT_TRANSLATE_X = imageWidth * 0.31;
            var TEXT_WIDTH = imageWidth * 0.09;
            if (gaugeType.type === 'type1' || gaugeType.type === 'type2') {
                TEXT_WIDTH = imageWidth * 0.0375;
            }
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
//                            ctx.fillText((valueCounter.toFixed(2)), 0, 0, TEXT_WIDTH);
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
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);
            }

            // Create custom layer in background buffer (backgroundBuffer)
            if (drawBackground) {
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 0, ledColor), 0, 0);
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.0280373832), steelseries.ColorDef.BLUE.dark.getRgbaColor(), true, true), 0, 0);
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.0280373832), steelseries.ColorDef.RED.medium.getRgbaColor(), true), 0, 0);
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground) {
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

                // Draw threshold image to background context
                if (thresholdVisible) {
                    backgroundContext.save();
                    backgroundContext.translate(centerX, centerY);
                    backgroundContext.rotate(rotationOffset + (threshold - minValue) * angleStep + HALF_PI);
                    backgroundContext.translate(-centerX, -centerY);
                    backgroundContext.drawImage(createThresholdImage(), imageWidth * 0.480369999, imageHeight * 0.13);
                    backgroundContext.translate(centerX, centerY);
                    backgroundContext.restore();
                }

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, true, true);

                // Create lcd background if selected in background buffer (backgroundBuffer)
                if (lcdVisible) {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.4, imageHeight * 0.15, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, (imageWidth - (imageWidth * 0.4)) / 2, imageHeight * 0.55);
                }
            }

            // Create pointer image in pointer buffer (contentBuffer)
            if (drawPointer) {
                drawPointerImage(pointerContext, imageWidth, pointerType, pointerColor, backgroundColor.labelColor, false);
                drawPointerImage(pointerShadowContext, imageWidth, pointerType, pointerColor, backgroundColor.labelColor, true);
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle, gaugeType);
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
                ledBufferOn.width = Math.ceil(size * 0.0934579439);
                ledBufferOn.height = Math.ceil(size * 0.0934579439);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(size * 0.0934579439);
                ledBufferOff.height = Math.ceil(size * 0.0934579439);
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
		};

		this.setUnitString = function(unit){
            unitString = unit;
            init({background: true});
		};

		this.setMinValue = function(value){
            minValue = value;
            init({background: true});
		};
	
		this.getMinValue = function(){
			return minValue;
		};

		this.setMaxValue = function(value){
            maxValue = value;
            init({background: true});
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
            resetBuffers({pointer: true});
            pointerType = newPointerType;
            init({pointer: true});
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

        this.repaint = function() {
            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      pointer: true,
                      foreground: true});
            }

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            mainCtx.drawImage(frameBuffer, 0, 0);

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
            mainCtx.drawImage(foregroundBuffer, 0, 0);
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
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
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
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);

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

        var sectionAngles =[];
        var isSectionsVisible = false;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

        // Misc
        var stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
        var lcdFont = Math.floor(imageWidth / 10) + 'px LCDMono2Ultra';

        // Constants
        var HALF_PI = Math.PI / 2;
        var ACTIVE_LED_POS_X = imageWidth * 0.1168224299;
        var ACTIVE_LED_POS_Y = imageWidth * 0.4859813084;
        var LED_POS_X = imageWidth * 0.453271028;
        var LED_POS_Y = imageHeight * 0.65;
        var RAD_FACTOR = Math.PI / 180;

        switch (gaugeType.type) {
            case "type1":
                freeAreaAngle = 0;
                rotationOffset = (1.5 * Math.PI) - HALF_PI;
                bargraphOffset = 0;
                tickmarkOffset = 0.5 * Math.PI;
                angleRange = HALF_PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type2":
                freeAreaAngle = 0;
                rotationOffset = (1.5 * Math.PI) - HALF_PI;
                bargraphOffset = 0;
                tickmarkOffset = HALF_PI;
                angleRange = Math.PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type3":
                freeAreaAngle = 0;
                rotationOffset = Math.PI - HALF_PI;
                bargraphOffset = -HALF_PI;
                tickmarkOffset = 0;
                angleRange = 1.5 * Math.PI;
                degAngleRange = angleRange / Math.PI * 180;
                angleStep = angleRange / range;
                break;

            case "type4":

            default:
                freeAreaAngle = 60 * Math.PI / 180;
                rotationOffset = Math.PI + (freeAreaAngle / 2.0) - HALF_PI;
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
        var activeLedBuffer = createBuffer(Math.ceil(size * 0.06074766355140187), Math.ceil(size * 0.023364486));
        var activeLedContext = activeLedBuffer.getContext('2d');

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(Math.ceil(size * 0.0934579439), Math.ceil(size * 0.0934579439));
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(Math.ceil(size * 0.0934579439), Math.ceil(size * 0.0934579439));
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the background of the led
        var ledBackground;

        // Buffer for static foreground painting code
        var foregroundBuffer = createBuffer(size, size);
        var foregroundContext = foregroundBuffer.getContext('2d');

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
                    rotationOffset = (1.5 * Math.PI) - HALF_PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = HALF_PI;
                    angleStep = angleRange / range;
                    break;

                case 'type2':
                    freeAreaAngle = 0;
                    rotationOffset = (1.5 * Math.PI) - HALF_PI;
                    tickmarkOffset = HALF_PI;
                    angleRange = Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type3':
                    freeAreaAngle = 0;
                    rotationOffset = Math.PI - HALF_PI;
                    tickmarkOffset = 0;
                    angleRange = 1.5 * Math.PI;
                    angleStep = angleRange / range;
                    break;

                case 'type4':
                default:
                    freeAreaAngle = 60 * RAD_FACTOR;
                    rotationOffset = Math.PI + (freeAreaAngle / 2.0) - HALF_PI;
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

            initialized = true;

            calculate();

            // Create frame in frame buffer (frameBuffer)
            if (drawFrame && frameVisible) {
                drawRadialFrameImage(frameContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            // Create background in background buffer (backgroundBuffer)
            if (drawBackground) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);
            }

            // Create custom layer in background buffer (backgroundBuffer)
            if (drawBackground) {
                drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 0, ledColor), 0, 0);

                // Buffer the background of the led for blinking
                ledBackground = backgroundContext.getImageData(imageWidth * 0.453271028, imageHeight * 0.65, Math.ceil(size * 0.0934579439), Math.ceil(size * 0.0934579439));
            }

            // Create tickmarks in background buffer (backgroundBuffer)
            if (drawBackground) {
                drawTickmarksImage(backgroundContext, labelNumberFormat);

                // Create bargraphtrack in background buffer (backgroundBuffer)
                drawBargraphTrackImage(backgroundContext);

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext, imageWidth, imageHeight, titleString, unitString, backgroundColor, true, true);

                // Create lcd background if selected in background buffer (backgroundBuffer)
                if (lcdVisible) {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.48, imageHeight * 0.15, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, (imageWidth - (imageWidth * 0.48)) / 2, imageHeight * 0.425);
                }
            }

            // Convert Sections into angles
            isSectionsVisible = false;
            if (null !== section && 0 < section.length) {
                isSectionsVisible = true;
                var sectionIndex = section.length;
                do {
                    sectionIndex--;
                    sectionAngles.push({start: (((section[sectionIndex].start + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange),
                                         stop: (((section[sectionIndex].stop + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange),
                                        color: customColorDef(section[sectionIndex].color)});
                } while (0 < sectionIndex);
            }

            // Create an image of an active led in active led buffer (activeLedBuffer)
            if (drawValue) {
                drawActiveLed(activeLedContext, valueColor);
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false, gaugeType);
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
                activeLedBuffer.width = Math.ceil(size * 0.06074766355140187);
                activeLedBuffer.height = Math.ceil(size * 0.023364486);
                activeLedContext = activeLedBuffer.getContext('2d');
            }

            if (resetLed) {
                // Buffer for led on painting code
                ledBufferOn.width = Math.ceil(size * 0.0934579439);
                ledBufferOn.height = Math.ceil(size * 0.0934579439);
                ledContextOn = ledBufferOn.getContext('2d');

                // Buffer for led off painting code
                ledBufferOff.width = Math.ceil(size * 0.0934579439);
                ledBufferOff.height = Math.ceil(size * 0.0934579439);
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
            ctx.lineWidth = 17;
            ctx.beginPath();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset - 4 * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
            ctx.arc(centerX, centerY, imageWidth * 0.3551401869, 0, angleRange + 8 * Math.PI / 180, false);
            ctx.rotate(-rotationOffset);
            var ledTrackFrameGradient = ctx.createLinearGradient((0.5046728971962616 * imageWidth), (0.10747663551401869 * imageHeight), ((0.5046728971962616 + 4.835638062053801E-17) * imageWidth), ((0.10747663551401869 + 0.7897196261682243) * imageHeight));
            ledTrackFrameGradient.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
            ledTrackFrameGradient.addColorStop(0.22, 'rgba(51, 51, 51, 1.0)');
            ledTrackFrameGradient.addColorStop(0.76, 'rgba(51, 51, 51, 1.0)');
            ledTrackFrameGradient.addColorStop(1.0, 'rgba(204, 204, 204, 1.0)');
            ctx.strokeStyle = ledTrackFrameGradient;
            ctx.stroke();
            ctx.restore();

            // Main
            ctx.save();
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset - 4 * Math.PI / 180);
            ctx.translate(-centerX, -centerY);
            ctx.arc(centerX, centerY, imageWidth * 0.3551401869, 0, angleRange + 8 * Math.PI / 180, false);
            ctx.rotate(-rotationOffset);
            var ledTrackMainGradient = ctx.createLinearGradient((0.5046728971962616 * imageWidth), (0.11214953271028037 * imageHeight), ((0.5046728971962616 + 4.778411576112336E-17) * imageWidth), ((0.11214953271028037 + 0.780373831775701) * imageHeight));
            ledTrackMainGradient.addColorStop(0.0, 'rgba(17, 17, 17, 1.0)');
            ledTrackMainGradient.addColorStop(1.0, 'rgba(51, 51, 51, 1.0)');
            ctx.strokeStyle = ledTrackMainGradient;
            ctx.stroke();
            ctx.restore();

            // Draw inactive leds
            var ledCenterX = (imageWidth * 0.1168224299 + imageWidth * 0.06074766355140187) / 2;
            var ledCenterY = (imageWidth * 0.4859813084 + imageWidth * 0.023364486) / 2.0;
            var ledOffGradient = ctx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, 0.030373831775700934 * imageWidth);
            ledOffGradient.addColorStop(0.0, 'rgba(60, 60, 60, 1.0)');
            ledOffGradient.addColorStop(1.0, 'rgba(50, 50, 50, 1.0)');

            for (var angle = 0; angle <= degAngleRange; angle += 5.0) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate((angle * Math.PI / 180) + bargraphOffset);
                ctx.translate(-centerX, -centerY);
                ctx.beginPath();
                ctx.rect(imageWidth * 0.1168224299, imageWidth * 0.4859813084, imageWidth * 0.06074766355140187, imageWidth * 0.023364486);
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
            ledGradient.addColorStop(0.0, color.light.getRgbaColor());
            ledGradient.addColorStop(1.0, color.dark.getRgbaColor());
            ctx.fillStyle = ledGradient;
            ctx.fill();
            ctx.restore();
        };

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
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            //var valueWidth = mainCtx.measureText(value).width;
            mainCtx.fillText(value.toFixed(lcdDecimals), (imageWidth + (imageWidth * 0.48)) / 2 - 2, imageWidth * 0.5, imageWidth * 0.48);
            //var unitWidth = mainCtx.measureText(unitString).width;
            //mainCtx.fillText(unitString, (imageWidth - unitWidth) / 2.0, imageHeight * 0.38, imageWidth * 0.2);

            mainCtx.restore();
        };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1.0);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = imageWidth * 0.04;
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);
            var rotationStep = angleStep * minorTickSpacing;
            var textRotationAngle;

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;
            var TEXT_TRANSLATE_X = imageWidth * 0.28;
            var TEXT_WIDTH = imageWidth * 0.09;
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
                    ctx.rotate(textRotationAngle);
                    switch(labelNumberFormat.format) {
                        case 'fractional':
//                            ctx.fillText((valueCounter.toFixed(2)), 0, 0, TEXT_WIDTH);
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
                    continue;
                }
                ctx.rotate(rotationStep);
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

                mainCtx.save();
               // mainCtx.clearRect(imageWidth * 0.453271028, imageHeight * 0.65, Math.ceil(size * 0.0934579439), Math.ceil(size * 0.0934579439));
               // mainCtx.putImageData(ledBackground, imageWidth * 0.453271028, imageHeight * 0.65);
                mainCtx.drawImage(ledBuffer, imageWidth * 0.453271028, imageHeight * 0.65);

                mainCtx.restore();
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

		this.setSection = function(areaSec){
                section = areaSec;
                resetBuffers({foreground: true});
                init({background: true,
                    foreground: true
                    });
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

        this.repaint = function() {

            if (!initialized) {
                init({frame: true,
                      background: true,
                      led: true,
                      value: true,
                      foreground: true});
            }

            mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame image
            mainCtx.drawImage(frameBuffer, 0, 0);

            // Draw buffered image to visible canvas
            mainCtx.drawImage(backgroundBuffer, 0, 0);

            // Draw active leds
            var activeLedAngle = ((value + Math.abs(minValue)) / (maxValue - minValue)) * degAngleRange;
            var activeLedColor;
            var lastActiveLedColor = valueColor;
            for (var angle = 0; angle <= activeLedAngle; angle += 5.0) {
                //check for LED color
                activeLedColor = valueColor;
                if (isSectionsVisible) {
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
                if (value < threshold)
                {
                    ledBlinking = false;
                    ledBuffer = ledBufferOff;
                }
                mainCtx.drawImage(ledBuffer, LED_POS_X, LED_POS_Y);
            }

            // Draw foreground
            mainCtx.drawImage(foregroundBuffer, 0, 0);

            mainCtx.restore();
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
        mainCtx.save();
        mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

        // Set the size
        mainCtx.canvas.width = size;
        mainCtx.canvas.height = size;

        var imageWidth = size;
        var imageHeight = size;

        var centerX = imageWidth / 2;
        var centerY = imageHeight * 0.7336448598;

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
        var ledBufferOn = createBuffer(size * 0.0934579439, size * 0.0934579439);
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(size * 0.0934579439, size * 0.0934579439);
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.0280373832), Math.ceil(size * 0.0280373832));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(size * 0.0280373832), Math.ceil(size * 0.0280373832));
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
            ctx.save();
            if ('type5' === gaugeType.type) {
                switch(orientation.type) {
                    case 'west':
                        // Min post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.44, imageHeight * 0.80);

                        // Max post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.44, imageHeight * 0.16);
                        break;

                    default:
                        // Min post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.2 - imageHeight * 0.03738316893577576, imageHeight * 0.446666666666);

                        // Max post
                        ctx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.03738316893577576), steelseries.KnobType.STANDARD_KNOB, knobStyle), imageWidth * 0.8, imageHeight * 0.446666666666);
                        break;
                }
            }
            ctx.restore();
        };

        var createThresholdImage = function() {
            var thresholdBuffer = doc.createElement('canvas');
            thresholdBuffer.width = Math.ceil(size * 0.046728972);
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0.0, 'rgb(82, 0, 0)');
            gradThreshold.addColorStop(0.3, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(0.59, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(1.0, 'rgb(82, 0, 0)');
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
            ctx.moveTo(0, 0);
            ctx.closePath();
            if (filled) {
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

        ctx.font = 0.04672897196261682 * imageWidth + 'px sans-serif';
        var titleWidth = ctx.measureText(titleString).width;
        ctx.fillText(titleString, (imageWidth - titleWidth) / 2.0, imageHeight * 0.4, imageWidth * 0.3);
        var unitWidth = ctx.measureText(unitString).width;
        ctx.fillText(unitString, (imageWidth - unitWidth) / 2.0, imageHeight * 0.47, imageWidth * 0.2);

        ctx.restore();
    };

        var drawTickmarksImage = function(ctx, labelNumberFormat) {
            backgroundColor.labelColor.setAlpha(1.0);
            ctx.save();

            if (steelseries.Orientation.WEST === orientation) {
                ctx.translate(centerX, centerX);
                ctx.rotate(-Math.PI / 2);
                ctx.translate(-centerX, -centerX);
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = imageWidth * 0.04;
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

        var drawPointerImage = function(ctx, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                    ctx.shadowBlur = 3;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            }

            switch (pointerType.type) {
                case 'type2':
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.5 * imageWidth), (0.7333333333333333 * imageHeight), (0.5 * imageWidth), (0.3 * imageHeight));
                        grad.addColorStop(0.0, backgroundColor.labelColor.getRgbaColor());
                        grad.addColorStop(0.36, backgroundColor.labelColor.getRgbaColor());
                        grad.addColorStop(0.3601, pointerColor.light.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5186915887850467, imageHeight * 0.705607476635514);
                    ctx.lineTo(imageWidth * 0.5093457943925234, imageHeight * 0.6962616822429907);
                    ctx.lineTo(imageWidth * 0.5093457943925234, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.5046728971962616, imageHeight * 0.2897196261682243);
                    ctx.lineTo(imageWidth * 0.4953271028037383, imageHeight * 0.2897196261682243);
                    ctx.lineTo(imageWidth * 0.49065420560747663, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.49065420560747663, imageHeight * 0.6962616822429907);
                    ctx.lineTo(imageWidth * 0.48130841121495327, imageHeight * 0.705607476635514);
                    ctx.bezierCurveTo(imageWidth * 0.48130841121495327, imageHeight * 0.705607476635514, imageWidth * 0.4672897196261682, imageHeight * 0.7242990654205608, imageWidth * 0.4672897196261682, imageHeight * 0.7336448598130841);
                    ctx.bezierCurveTo(imageWidth * 0.4672897196261682, imageHeight * 0.7523364485981309, imageWidth * 0.48130841121495327, imageHeight * 0.7663551401869159, imageWidth * 0.5, imageHeight * 0.7663551401869159);
                    ctx.bezierCurveTo(imageWidth * 0.5186915887850467, imageHeight * 0.7663551401869159, imageWidth * 0.5327102803738317, imageHeight * 0.7523364485981309, imageWidth * 0.5327102803738317, imageHeight * 0.7336448598130841);
                    ctx.bezierCurveTo(imageWidth * 0.5327102803738317, imageHeight * 0.7242990654205608, imageWidth * 0.5186915887850467, imageHeight * 0.705607476635514, imageWidth * 0.5186915887850467, imageHeight * 0.705607476635514);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type3':
                    ctx.beginPath();
                    ctx.rect(imageWidth * 0.4953271028037383, imageHeight * 0.2897196261682243, imageWidth * 0.009345794392523364, imageHeight * 0.4485981308);
                    ctx.closePath();
                    if (!shadow) {
                        ctx.fillStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.fill();
                    break;

                case 'type4':
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.4672897196261682 * imageWidth), 0.48130841121495327 * imageHeight, 0.5280373832 * imageWidth, 0.48130841121495327 * imageHeight);
                        grad.addColorStop(0.0, pointerColor.dark.getRgbaColor());
                        grad.addColorStop(0.51, pointerColor.dark.getRgbaColor());
                        grad.addColorStop(0.52, pointerColor.light.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.29439252336448596);
                    ctx.lineTo(imageWidth * 0.514018691588785, imageHeight * 0.3037383177570093);
                    ctx.lineTo(imageWidth * 0.5327102803738317, imageHeight * 0.7336448598130841);
                    ctx.lineTo(imageWidth * 0.5233644859813084, imageHeight * 0.8364485981308412);
                    ctx.lineTo(imageWidth * 0.4766355140186916, imageHeight * 0.8364485981308412);
                    ctx.lineTo(imageWidth * 0.4672897196261682, imageHeight * 0.7336448598130841);
                    ctx.lineTo(imageWidth * 0.49065420560747663, imageHeight * 0.3037383177570093);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.29439252336448596);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type5':
                    if (!shadow) {
                        grad = ctx.createLinearGradient(0.46 * imageWidth, 0.7333333333333333 * imageHeight, 0.54 * imageWidth, 0.7333333333333333 * imageHeight);
                        grad = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.49065420560747663 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), (0.49065420560747663 * imageHeight));
                        grad.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.74);
                    ctx.lineTo(imageWidth * 0.5266666666666666, imageHeight * 0.74);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.3);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.74);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.74);
                    ctx.closePath();
                    ctx.fill();

                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.stroke();
                    break;

                case 'type6':
                    if (!shadow) {
                        ctx.fillStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.47333333333333333, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.6);
                    ctx.lineTo(imageWidth * 0.48, imageHeight * 0.49333333333333335);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.52, imageHeight * 0.49333333333333335);
                    ctx.lineTo(imageWidth * 0.5266666666666666, imageHeight * 0.5933333333333334);
                    ctx.lineTo(imageWidth * 0.5266666666666666, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.5933333333333334);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.49333333333333335);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.6);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.7333333333333333);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type7':
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.47333333333333333 * imageWidth), (0.72 * imageHeight), (0.5266666667 * imageWidth), (0.72 * imageHeight));
                        grad.addColorStop(0.0, pointerColor.dark.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.4866666666666667, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.5266666666666666, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.4866666666666667, imageHeight * 0.30666666666666664);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type8':
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.46 * imageWidth), (0.7066666666666667 * imageHeight), (0.54 * imageWidth), (0.7066666666666667 * imageHeight));
                        grad.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.7666666666666667);
                    ctx.lineTo(imageWidth * 0.5333333333333333, imageHeight * 0.7333333333333333);
                    ctx.bezierCurveTo(imageWidth * 0.5333333333333333, imageHeight * 0.7333333333333333, imageWidth * 0.5066666666666667, imageHeight * 0.7066666666666667, imageWidth * 0.5, imageHeight * 0.31333333333333335);
                    ctx.bezierCurveTo(imageWidth * 0.49333333333333335, imageHeight * 0.7066666666666667, imageWidth * 0.4666666666666667, imageHeight * 0.7333333333333333, imageWidth * 0.4666666666666667, imageHeight * 0.7333333333333333);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.7666666666666667);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'type9':
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.5280373831775701 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), (0.5280373831775701 * imageHeight));
                        grad.addColorStop(0.0, 'rgba(50, 50, 50, 1.0)');
                        grad.addColorStop(0.48, 'rgba(102, 102, 102, 1.0)');
                        grad.addColorStop(1.0, 'rgba(50, 50, 50, 1.0)');
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = '#2E2E2E';
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.49333333333333335, imageHeight * 0.42);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.42);
                    ctx.lineTo(imageWidth * 0.5133333333333333, imageHeight * 0.66);
                    ctx.lineTo(imageWidth * 0.4866666666666667, imageHeight * 0.66);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.42);
                    ctx.closePath();
                    ctx.moveTo(imageWidth * 0.49333333333333335, imageHeight * 0.3);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.7);
                    ctx.lineTo(imageWidth * 0.47333333333333333, imageHeight * 0.7666666666666667);
                    ctx.bezierCurveTo(imageWidth * 0.47333333333333333, imageHeight * 0.7666666666666667, imageWidth * 0.47333333333333333, imageHeight * 0.8533333333333334, imageWidth * 0.47333333333333333, imageHeight * 0.8533333333333334);
                    ctx.bezierCurveTo(imageWidth * 0.47333333333333333, imageHeight * 0.86, imageWidth * 0.48, imageHeight * 0.86, imageWidth * 0.5, imageHeight * 0.86);
                    ctx.bezierCurveTo(imageWidth * 0.52, imageHeight * 0.86, imageWidth * 0.5266666666666666, imageHeight * 0.86, imageWidth * 0.5266666666666666, imageHeight * 0.8533333333333334);
                    ctx.bezierCurveTo(imageWidth * 0.5266666666666666, imageHeight * 0.8533333333333334, imageWidth * 0.5266666666666666, imageHeight * 0.7666666666666667, imageWidth * 0.5266666666666666, imageHeight * 0.7666666666666667);
                    ctx.lineTo(imageWidth * 0.5266666666666666, imageHeight * 0.7);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.3);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.3);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.49333333333333335, imageHeight * 0.4066666666666667);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.4066666666666667);
                    ctx.lineTo(imageWidth * 0.5066666666666667, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.30666666666666664);
                    ctx.lineTo(imageWidth * 0.49333333333333335, imageHeight * 0.4066666666666667);
                    ctx.closePath();
                    if (!shadow) {
                        ctx.fillStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.fill();
                    break;

                case 'type10':
                    // POINTER_TYPE10
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.14953271028037382);
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.3);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.3, imageWidth * 0.43333333333333335, imageHeight * 0.7133333333333334, imageWidth * 0.43333333333333335, imageHeight * 0.7266666666666667);
                    ctx.bezierCurveTo(imageWidth * 0.43333333333333335, imageHeight * 0.76, imageWidth * 0.46, imageHeight * 0.7933333333333333, imageWidth * 0.5, imageHeight * 0.7933333333333333);
                    ctx.bezierCurveTo(imageWidth * 0.54, imageHeight * 0.7933333333333333, imageWidth * 0.5666666666666667, imageHeight * 0.76, imageWidth * 0.5666666666666667, imageHeight * 0.7266666666666667);
                    ctx.bezierCurveTo(imageWidth * 0.5666666666666667, imageHeight * 0.7133333333333334, imageWidth * 0.5, imageHeight * 0.3, imageWidth * 0.5, imageHeight * 0.3);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.49065420560747663 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), ((0.49065420560747663 + 0.0) * imageHeight));
                        grad.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.4999, pointerColor.light.getRgbaColor());
                        grad.addColorStop(0.5, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'type11':
                    // POINTER_TYPE11
                    ctx.beginPath();
                    ctx.moveTo(0.5 * imageWidth, 0.3 * imageHeight);
                    ctx.lineTo(0.4866666666666667 * imageWidth, 0.7333333333333333 * imageHeight);
                    ctx.bezierCurveTo(0.4866666666666667 * imageWidth, 0.7333333333333333 * imageHeight, 0.4866666666666667 * imageWidth, 0.8066666666666666 * imageHeight, 0.5 * imageWidth, 0.8066666666666666 * imageHeight);
                    ctx.bezierCurveTo(0.5133333333333333 * imageWidth, 0.8066666666666666 * imageHeight, 0.5133333333333333 * imageWidth, 0.7333333333333333 * imageHeight, 0.5133333333333333 * imageWidth, 0.7333333333333333 * imageHeight);
                    ctx.lineTo(0.5 * imageWidth, 0.3 * imageHeight);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(0.5066666666666667 * imageWidth, 0.22666666666666666 * imageHeight, 0.5066666666666667 * imageWidth, 0.8666666666666667 * imageHeight);
                        grad.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'type12':
                    // POINTER_TYPE12
                    ctx.beginPath();
                    ctx.moveTo(0.5 * imageWidth, 0.3 * imageHeight);
                    ctx.lineTo(0.4866666666666667 * imageWidth, 0.7333333333333333 * imageHeight);
                    ctx.lineTo(0.5 * imageWidth, 0.7466666666666667 * imageHeight);
                    ctx.lineTo(0.5133333333333333 * imageWidth, 0.7333333333333333 * imageHeight);
                    ctx.lineTo(0.5 * imageWidth, 0.3 * imageHeight);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(0.5066666666666667 * imageWidth, 0.22666666666666666 * imageHeight, 0.5066666666666667 * imageWidth, 0.7466666666666667 * imageHeight);
                        grad.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'type13':
                    // POINTER_TYPE13
                    ctx.beginPath();
                    ctx.moveTo(0.4866666666666667 * imageWidth, 0.32666666666666666 * imageHeight);
                    ctx.lineTo(0.5 * imageWidth, 0.29333333333333333 * imageHeight);
                    ctx.lineTo(0.5133333333333333 * imageWidth, 0.32666666666666666 * imageHeight);
                    ctx.lineTo(0.5133333333333333 * imageWidth, 0.7466666666666667 * imageHeight);
                    ctx.lineTo(0.4866666666666667 * imageWidth, 0.7466666666666667 * imageHeight);
                    ctx.lineTo(0.4866666666666667 * imageWidth, 0.32666666666666666 * imageHeight);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(0.5 * imageWidth, 0.7333333333333333 * imageHeight, 0.5 * imageWidth, 0.29333333333333333 * imageHeight);
                        grad.addColorStop(0.0, backgroundColor.labelColor.getRgbaColor());
                        grad.addColorStop(0.849999, backgroundColor.labelColor.getRgbaColor());
                        grad.addColorStop(0.85, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = grad;
                    }
                    ctx.fill();
                    break;

                case 'type1':
                default:
                    if (!shadow) {
                        grad = ctx.createLinearGradient(0.49333333333333335 * imageWidth, 0.38666666666666666 * imageHeight, 0.49333333333333335 * imageWidth, 0.72 * imageHeight);
                        grad.addColorStop(0.0, pointerColor.veryDark.getRgbaColor());
                        grad.addColorStop(0.3, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(0.59, pointerColor.medium.getRgbaColor());
                        grad.addColorStop(1.0, pointerColor.veryDark.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5186915887850467, imageHeight * 0.705607476635514);
                    ctx.bezierCurveTo(imageWidth * 0.514018691588785, imageHeight * 0.6915887850467289, imageWidth * 0.5093457943925234, imageHeight * 0.6261682242990654, imageWidth * 0.5093457943925234, imageHeight * 0.6121495327102804);
                    ctx.bezierCurveTo(imageWidth * 0.5046728971962616, imageHeight * 0.5981308411214953, imageWidth * 0.5, imageHeight * 0.29906542056074764, imageWidth * 0.5, imageHeight * 0.29906542056074764);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.29906542056074764, imageWidth * 0.49065420560747663, imageHeight * 0.5981308411214953, imageWidth * 0.49065420560747663, imageHeight * 0.6121495327102804);
                    ctx.bezierCurveTo(imageWidth * 0.49065420560747663, imageHeight * 0.6308411214953271, imageWidth * 0.48598130841121495, imageHeight * 0.6915887850467289, imageWidth * 0.48130841121495327, imageHeight * 0.705607476635514);
                    ctx.bezierCurveTo(imageWidth * 0.4719626168224299, imageHeight * 0.7149532710280374, imageWidth * 0.4672897196261682, imageHeight * 0.7242990654205608, imageWidth * 0.4672897196261682, imageHeight * 0.7336448598130841);
                    ctx.bezierCurveTo(imageWidth * 0.4672897196261682, imageHeight * 0.7523364485981309, imageWidth * 0.48130841121495327, imageHeight * 0.7663551401869159, imageWidth * 0.5, imageHeight * 0.7663551401869159);
                    ctx.bezierCurveTo(imageWidth * 0.5186915887850467, imageHeight * 0.7663551401869159, imageWidth * 0.5327102803738317, imageHeight * 0.7523364485981309, imageWidth * 0.5327102803738317, imageHeight * 0.7336448598130841);
                    ctx.bezierCurveTo(imageWidth * 0.5327102803738317, imageHeight * 0.7242990654205608, imageWidth * 0.5280373831775701, imageHeight * 0.7149532710280374, imageWidth * 0.5186915887850467, imageHeight * 0.705607476635514);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
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
            if (drawBackground) {
                drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, size/2, imageWidth, imageHeight);
            }

            // Draw LED ON in ledBuffer_ON
            if (drawLed) {
                ledContextOn.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 1, ledColor), 0, 0);

                // Draw LED ON in ledBuffer_OFF
                ledContextOff.drawImage(createLedImage(Math.ceil(size * 0.0934579439), 0, ledColor), 0, 0);
            }

            // Draw min measured value indicator in minMeasuredValueBuffer
            if (minMeasuredValueVisible) {
                if (steelseries.Orientation.WEST === orientation) {
                    minMeasuredValueCtx.translate(centerX, centerX);
                    minMeasuredValueCtx.rotate(-Math.PI / 2);
                    minMeasuredValueCtx.translate(-centerX, -centerX);
                }
                minMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.0280373832), steelseries.ColorDef.BLUE.dark.getRgbaColor(), true, true), 0, 0);
                minMeasuredValueCtx.restore();
            }

            // Draw max measured value indicator in maxMeasuredValueBuffer
            if (maxMeasuredValueVisible) {
                if (steelseries.Orientation.WEST === orientation) {
                    maxMeasuredValueCtx.translate(centerX, centerX);
                    maxMeasuredValueCtx.rotate(-Math.PI / 2);
                    maxMeasuredValueCtx.translate(-centerX, -centerX);
                }
                maxMeasuredValueCtx.drawImage(createMeasuredValueImage(Math.ceil(size * 0.0280373832), steelseries.ColorDef.RED.medium.getRgbaColor(), true), 0, 0);
                maxMeasuredValueCtx.restore();
            }

            // Create alignment posts in background buffer (backgroundBuffer)
            if (drawBackground) {
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
                    backgroundContext.drawImage(createThresholdImage(), imageWidth * 0.475, imageHeight * 0.33);
                    backgroundContext.restore();
                }

                // Create title in background buffer (backgroundBuffer)
                drawTitleImage(backgroundContext);
            }

            // Create pointer image in pointer buffer (contentBuffer)
            if (drawPointer) {
                drawPointerImage(pointerContext, false);
                drawPointerImage(pointerShadowContext, true);
           }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle, gaugeType, orientation);
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
                ledBufferOn.width = Math.ceil(size * 0.0934579439);
                ledBufferOn.height = Math.ceil(size * 0.0934579439);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(size * 0.0934579439);
                ledBufferOff.height = Math.ceil(size * 0.0934579439);
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
            resetBuffers({
                background: true,
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
            resetBuffers({pointer: true});
            pointerType = newPointerType;
            init({pointer: true});
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

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            mainCtx.drawImage(frameBuffer, 0, 0);

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

            // we have to draw to a rotated temporary image area so we can translate in
            // absolute x, y values when drawing to main context
            var shadowOffset = imageWidth * 0.006;

            pointerRotContext.clearRect(0, 0, imageWidth, imageHeight);
            pointerRotContext.save();
            pointerRotContext.translate(centerX, centerY);
            pointerRotContext.rotate(angle);
            pointerRotContext.translate(-centerX, -centerY);
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
            mainCtx.translate(-centerX, -centerY);
            mainCtx.drawImage(pointerBuffer, 0, 0);
            mainCtx.restore();

            // Draw foreground
            if (steelseries.Orientation.WEST === orientation) {
                mainCtx.translate(centerX, centerX);
                mainCtx.rotate(Math.PI / 2);
                mainCtx.translate(-centerX, -centerX);
            }
            mainCtx.drawImage(foregroundBuffer, 0, 0);
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
        mainCtx.save();
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
            ledPosX = 0.453271028 * imageWidth;
            ledPosY = (18.0 / imageHeight) * imageHeight;
            stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageWidth / 10) + 'px LCDMono2Ultra';
        } else {
            ledPosX = (imageWidth - 18.0 - 16.0) / imageWidth * imageWidth;
            ledPosY = 0.453271028 * imageHeight;
            stdFont = Math.floor(imageHeight / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageHeight / 10) + 'px LCDMono2Ultra';
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
            }
            else {
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
        var ledBufferOn = createBuffer(Math.ceil(width * 0.0934579439), Math.ceil(width * 0.0934579439));
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(Math.ceil(width * 0.0934579439), Math.ceil(width * 0.0934579439));
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.0280373832), Math.ceil(width * 0.0280373832));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.0280373832), Math.ceil(width * 0.0280373832));
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
                lcdTextX = (imageWidth - (imageWidth * 0.5714285714)) / 2 + 1 + imageWidth * 0.5714285714 - 2;
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
                thresholdBuffer.width = Math.ceil(imageWidth * 0.046728972);
            } else {
                thresholdBuffer.width = Math.ceil(imageHeight * 0.046728972);
            }
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0.0, 'rgb(82, 0, 0)');
            gradThreshold.addColorStop(0.3, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(0.59, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(1.0, 'rgb(82, 0, 0)');
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
            backgroundColor.labelColor.setAlpha(1.0);
            ctx.save();
            ctx.textBaseline = 'middle';
            var fontSize;
//            var TEXT_WIDTH = imageWidth * 0.0375;
            var TEXT_WIDTH = imageWidth * 0.1;
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;
            var scaleBoundsX;
            var scaleBoundsY;
            var scaleBoundsW;
            var scaleBoundsH;
            var tickSpaceScaling = 1.0;

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
                fontSize = imageWidth * 0.62;
                ctx.textAlign = 'right';
                scaleBoundsX = 0;
                scaleBoundsY = imageHeight * 0.12864077669902912;
                scaleBoundsW = 0;
                scaleBoundsH = (imageHeight * 0.8567961165048543 - imageHeight * 0.12864077669902912);
                tickSpaceScaling = scaleBoundsH / (maxValue - minValue);
            } else {
                minorTickStart = (0.65 * imageHeight);
                minorTickStop = (0.63 * imageHeight);
                mediumTickStart = (0.66 * imageHeight);
                mediumTickStop = (0.63 * imageHeight);
                majorTickStart = (0.67 * imageHeight);
                majorTickStop = (0.63 * imageHeight);
                fontSize = imageHeight * 0.62;
                ctx.textAlign = 'center';
                scaleBoundsX = imageWidth * 0.14285714285714285;
                scaleBoundsY = 0;
                scaleBoundsW = (imageWidth * 0.8710124827 - imageWidth * 0.14285714285714285);
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
                    ctx.lineWidth = 1.0;
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
            if (drawBackground) {
                drawLinearBackgroundImage(backgroundContext, backgroundColor, imageWidth, imageHeight);
            }

            if (drawLed) {
                if (vertical) {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(width * 0.0934579439), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(width * 0.0934579439), 0, ledColor), 0, 0);
                } else {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(height * 0.0934579439), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(height * 0.0934579439), 0, ledColor), 0, 0);
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
            if (drawBackground) {

                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat, vertical);
                var valuePos;
                // Draw threshold image to background context
                if (thresholdVisible) {
                    backgroundContext.save();
                    if (vertical) {
                        // Vertical orientation
                        valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (threshold / (maxValue - minValue));
                        backgroundContext.translate(imageWidth * 0.4357142857142857 - Math.ceil(imageWidth * 0.046728972) - 2, valuePos - Math.ceil(imageWidth * 0.046728972) / 2.0);
                    } else {
                        // Horizontal orientation
                        valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * threshold / (maxValue - minValue);
                        backgroundContext.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.046728972) / 2.0 + valuePos, imageHeight * 0.5714285714 + 2);
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
                // Create lcd background if selected in background buffer (backgroundBuffer)
                if (lcdVisible) {
                    if (vertical) {
                        lcdBuffer = createLcdBackgroundImage(imageWidth * 0.5714285714, imageHeight * 0.055, lcdColor);
                        backgroundContext.drawImage(lcdBuffer, ((imageWidth - (imageWidth * 0.5714285714)) / 2), imageHeight * 0.88);
                    } else {
                        lcdBuffer = createLcdBackgroundImage(imageWidth * 0.18, imageHeight * 0.15, lcdColor);
                        backgroundContext.drawImage(lcdBuffer, imageWidth * 0.695, imageHeight * 0.22);
                    }
                }
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground) {
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
                ledBufferOn.width = Math.ceil(width * 0.0934579439);
                ledBufferOn.height = Math.ceil(height * 0.0934579439);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(width * 0.0934579439);
                ledBufferOff.height = Math.ceil(height * 0.0934579439);
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
                top =  imageHeight * 0.12864077669902912; // position of max value
                bottom = imageHeight * 0.8567961165048543; // position of min value
                fullSize = bottom - top;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = top + fullSize - valueSize;
                valueBackgroundStartX = 0;
                valueBackgroundStartY = top;
                valueBackgroundStopX = 0;
                valueBackgroundStopY = top + fullSize;
            } else {
                // Horizontal orientation
                top = imageWidth * 0.8567961165048543; // position of max value
                bottom = imageWidth * 0.14285714285714285; // position of min value
                fullSize = top - imageWidth * 0.12864077669902912;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = bottom;
                valueBackgroundStartX = top;
                valueBackgroundStartY = 0;
                valueBackgroundStopX = bottom;
                valueBackgroundStopY = 0;
            }

            var valueBackgroundTrackGradient = ctx.createLinearGradient(valueBackgroundStartX, valueBackgroundStartY, valueBackgroundStopX, valueBackgroundStopY);
            labelColor.setAlpha(0.0470588235);
            valueBackgroundTrackGradient.addColorStop(0.0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.1450980392);
            valueBackgroundTrackGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.1490196078);
            valueBackgroundTrackGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.0470588235);
            valueBackgroundTrackGradient.addColorStop(1.0, labelColor.getRgbaColor());
            ctx.fillStyle = valueBackgroundTrackGradient;

            if (vertical) {
                ctx.fillRect(imageWidth * 0.4357142857142857, top, imageWidth * 0.14285714285714285, fullSize);
            } else {
                ctx.fillRect(imageWidth * 0.14285714285714285, imageHeight * 0.4357142857142857, fullSize, imageHeight * 0.14285714285714285);
            }

            if (vertical) {
                // Vertical orientation
                valueBorderStartX = 0;
                valueBorderStartY = top;
                valueBorderStopX = 0;
                valueBorderStopY = top + fullSize;
            } else {
                // Horizontal orientation                ;
                valueBorderStartX = imageWidth * 0.14285714285714285 + fullSize;
                valueBorderStartY = 0;
                valueBorderStopX = imageWidth * 0.14285714285714285;
                valueBorderStopY = 0;
            }
            var valueBorderGradient = ctx.createLinearGradient(valueBorderStartX, valueBorderStartY, valueBorderStopX, valueBorderStopY);
            labelColor.setAlpha(0.2980392157);
            valueBorderGradient.addColorStop(0.0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.6862745098);
            valueBorderGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.6980392157);
            valueBorderGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.4);
            valueBorderGradient.addColorStop(1.0, labelColor.getRgbaColor());
            ctx.fillStyle = valueBorderGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.4357142857142857, top, imageWidth * 0.007142857142857143, fullSize);
                ctx.fillRect(imageWidth * 0.5714285714285714, top, imageWidth * 0.007142857142857143, fullSize);
            } else {
                ctx.fillRect(imageWidth * 0.14285714285714285, imageHeight * 0.4357142857, fullSize, imageHeight * 0.007142857142857143);
                ctx.fillRect(imageWidth * 0.14285714285714285, imageHeight * 0.5714285714, fullSize, imageHeight * 0.007142857142857143);
            }

            if (vertical) {
                // Vertical orientation
                valueStartX = imageWidth * 0.45;
                valueStartY = 0;
                valueStopX = imageWidth * 0.45 + imageWidth * 0.1142857143;
                valueStopY = 0;
            } else {
                // Horizontal orientation
                valueStartX = 0;
                valueStartY = imageHeight * 0.45;
                valueStopX = 0;
                valueStopY = imageHeight * 0.45 + imageHeight * 0.1142857143;
            }

            var valueBackgroundGradient = ctx.createLinearGradient(valueStartX, valueStartY, valueStopX, valueStopY);
            valueBackgroundGradient.addColorStop(0.0, valueColor.medium.getRgbaColor());
            valueBackgroundGradient.addColorStop(0.99, valueColor.light.getRgbaColor());
            valueBackgroundGradient.addColorStop(1.0, valueColor.light.getRgbaColor());
            ctx.fillStyle = valueBackgroundGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.45, valueTop, imageWidth * 0.1142857143, valueSize);
            } else {
                ctx.fillRect(valueTop, imageHeight * 0.45, valueSize, imageHeight * 0.1142857143);
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
            valueForegroundGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.7)');
            valueForegroundGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.05)');
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

            //mainCtx.save();
            mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);

            // Draw frame
            mainCtx.drawImage(frameBuffer, 0, 0);

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
                    valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (minMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth * 0.05) / 2.0 + 1);
                } else {
                    valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * minMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.05) / 2.0 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(minMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (maxMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth) * 0.05 / 2.0 + 1);
                } else {
                    valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * maxMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.05) / 2.0 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(maxMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            mainCtx.save();
            drawValue(mainCtx, imageWidth, imageHeight);
            mainCtx.restore();

            // Draw foreground
            mainCtx.drawImage(foregroundBuffer, 0, 0);
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
        var niceScale = (undefined === parameters.niceScale ? true : parameters.niceScale);
        var threshold = (undefined === parameters.threshold ? (maxValue - minValue) / 2 : parameters.threshold);
        var titleString = (undefined === parameters.titleString ? "" : parameters.titleString);
        var unitString = (undefined === parameters.unitString ? "" : parameters.unitString);
        var frameDesign = (undefined === parameters.frameDesign ? steelseries.FrameDesign.METAL : parameters.frameDesign);
        var frameVisible = (undefined === parameters.frameVisible ? true : parameters.frameVisible);
        var backgroundColor = (undefined === parameters.backgroundColor ? steelseries.BackgroundColor.DARK_GRAY : parameters.backgroundColor);
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
        var playAlarm = (undefined === parameters.playAlarm ? false : parameters.playAlarm);
        var alarmSound = (undefined === parameters.alarmSound ? false : parameters.alarmSound);

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
        var sectionPixels = [];
        var ledTimerId = 0;

        // Get the canvas context and clear it
        var mainCtx = doc.getElementById(canvas).getContext('2d');
        mainCtx.save();
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
            ledPosX = 0.453271028 * imageWidth;
            ledPosY = (18.0 / imageHeight) * imageHeight;
            stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageWidth / 10) + 'px LCDMono2Ultra';
        } else {
            ledPosX = (imageWidth - 18.0 - 16.0) / imageWidth * imageWidth;
            ledPosY = 0.453271028 * imageHeight;
            stdFont = Math.floor(imageHeight / 10) + 'px sans-serif';
            lcdFont = Math.floor(imageHeight / 10) + 'px LCDMono2Ultra';
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
            activeLedBuffer.width = imageWidth * 0.1214285714;
            activeLedBuffer.height = imageHeight * 0.0121359223;
        } else {
            activeLedBuffer.width = imageWidth * 0.0121359223;
            activeLedBuffer.height = imageHeight * 0.1214285714;
        }
        var activeLedContext = activeLedBuffer.getContext('2d');

        // Buffer for active bargraph led
        var inActiveLedBuffer = doc.createElement('canvas');
        if (vertical) {
            inActiveLedBuffer.width = imageWidth * 0.1214285714;
            inActiveLedBuffer.height = imageHeight * 0.0121359223;
        } else {
            inActiveLedBuffer.width = imageWidth * 0.0121359223;
            inActiveLedBuffer.height = imageHeight * 0.1214285714;
        }
        var inActiveLedContext = inActiveLedBuffer.getContext('2d');

        // Buffer for led on painting code
        var ledBufferOn = createBuffer(Math.ceil(width * 0.0934579439), Math.ceil(width * 0.0934579439));
        var ledContextOn = ledBufferOn.getContext('2d');

        // Buffer for led off painting code
        var ledBufferOff = createBuffer(Math.ceil(width * 0.0934579439), Math.ceil(width * 0.0934579439));
        var ledContextOff = ledBufferOff.getContext('2d');

        // Buffer for current led painting code
        var ledBuffer = ledBufferOff;

        // Buffer for the minMeasuredValue indicator
        var minMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.0280373832), Math.ceil(width * 0.0280373832));
        var minMeasuredValueCtx = minMeasuredValueBuffer.getContext('2d');

        // Buffer for the maxMeasuredValue indicator
        var maxMeasuredValueBuffer = createBuffer(Math.ceil(width * 0.0280373832), Math.ceil(width * 0.0280373832));
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
                lcdTextX = (imageWidth - (imageWidth * 0.5714285714)) / 2 + 1 + imageWidth * 0.5714285714 - 2;
                lcdTextY = imageHeight * 0.88 + 1 + (imageHeight * 0.055 - 2) / 2;
//                lcdTextWidth = imageWidth * 0.5714285714 - 2;
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
                thresholdBuffer.width = Math.ceil(imageWidth * 0.046728972);
            } else {
                thresholdBuffer.width = Math.ceil(imageHeight * 0.046728972);
            }
            thresholdBuffer.height = Math.ceil(thresholdBuffer.width * 0.9);
            var thresholdCtx = thresholdBuffer.getContext('2d');

            thresholdCtx.save();
            var gradThreshold = thresholdCtx.createLinearGradient(0, 0.1, 0, thresholdBuffer.height * 0.9);
            gradThreshold.addColorStop(0.0, 'rgb(82, 0, 0)');
            gradThreshold.addColorStop(0.3, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(0.59, 'rgb(252, 29, 0)');
            gradThreshold.addColorStop(1.0, 'rgb(82, 0, 0)');
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
            backgroundColor.labelColor.setAlpha(1.0);
            ctx.save();
            ctx.textBaseline = 'middle';
            var fontSize;
//            var TEXT_WIDTH = imageWidth * 0.0375;
            var TEXT_WIDTH = imageWidth * 0.1;
            ctx.font = fontSize + 'px sans-serif';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();

            var valueCounter = minValue;
            var majorTickCounter = maxNoOfMinorTicks - 1;
            var scaleBoundsX;
            var scaleBoundsY;
            var scaleBoundsW;
            var scaleBoundsH;
            var tickSpaceScaling = 1.0;

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
                fontSize = imageWidth * 0.62;
                ctx.textAlign = 'right';
                scaleBoundsX = 0;
                scaleBoundsY = imageHeight * 0.12864077669902912;
                scaleBoundsW = 0;
                scaleBoundsH = (imageHeight * 0.8567961165048543 - imageHeight * 0.12864077669902912);
                tickSpaceScaling = scaleBoundsH / (maxValue - minValue);
            } else {
                minorTickStart = (0.65 * imageHeight);
                minorTickStop = (0.63 * imageHeight);
                mediumTickStart = (0.66 * imageHeight);
                mediumTickStop = (0.63 * imageHeight);
                majorTickStart = (0.67 * imageHeight);
                majorTickStop = (0.63 * imageHeight);
                fontSize = imageHeight * 0.62;
                ctx.textAlign = 'center';
                scaleBoundsX = imageWidth * 0.14285714285714285;
                scaleBoundsY = 0;
                scaleBoundsW = (imageWidth * 0.8710124827 - imageWidth * 0.14285714285714285);
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
                    ctx.lineWidth = 1.0;
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
            if (drawBackground) {
                drawLinearBackgroundImage(backgroundContext, backgroundColor, imageWidth, imageHeight);
            }

            if (drawLed) {
                if (vertical) {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(width * 0.0934579439), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(width * 0.0934579439), 0, ledColor), 0, 0);
                } else {
                    // Draw LED ON in ledBuffer_ON
                    ledContextOn.drawImage(createLedImage(Math.ceil(height * 0.0934579439), 1, ledColor), 0, 0);

                    // Draw LED ON in ledBuffer_OFF
                    ledContextOff.drawImage(createLedImage(Math.ceil(height * 0.0934579439), 0, ledColor), 0, 0);
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
            if (drawBackground) {
                var valuePos;
                // Create tickmarks in background buffer (backgroundBuffer)
                drawTickmarksImage(backgroundContext, labelNumberFormat, vertical);

                // Draw threshold image to background context
                if (thresholdVisible) {
                    backgroundContext.save();
                    if (vertical) {
                        // Vertical orientation
                        valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (threshold / (maxValue - minValue));
                        backgroundContext.translate(imageWidth * 0.4357142857142857 - Math.ceil(imageWidth * 0.046728972) - 2, valuePos - Math.ceil(imageWidth * 0.046728972) / 2.0);
                    } else {
                        // Horizontal orientation
                        valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * threshold / (maxValue - minValue);
                        backgroundContext.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.046728972) / 2.0 + valuePos, imageHeight * 0.5714285714 + 2);
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

                // Create lcd background if selected in background buffer (backgroundBuffer)
                if (lcdVisible) {
                    if (vertical) {
                        lcdBuffer = createLcdBackgroundImage(imageWidth * 0.5714285714, imageHeight * 0.055, lcdColor);
                        backgroundContext.drawImage(lcdBuffer, ((imageWidth - (imageWidth * 0.5714285714)) / 2), imageHeight * 0.88);
                    } else {
                        lcdBuffer = createLcdBackgroundImage(imageWidth * 0.18, imageHeight * 0.15, lcdColor);
                        backgroundContext.drawImage(lcdBuffer, imageWidth * 0.695, imageHeight * 0.22);
                    }
                }
            }

            // Draw leds of bargraph
            if (drawBargraphLed) {
                drawInActiveLed(inActiveLedContext);
                drawActiveLed(activeLedContext, valueColor);
            }

            // Convert Sections into angles
            isSectionsVisible = false;
            if (null !== section && 0 < section.length) {
                isSectionsVisible = true;
                var sectionIndex = section.length;
                var top, bottom, fullSize, ledWidth2;

                if (vertical) {
                    // Vertical orientation
                    top =  imageHeight * 0.12864077669902912; // position of max value
                    bottom = imageHeight * 0.8567961165048543; // position of min value
                    fullSize = bottom - top;
                    ledWidth2 = 0;
                } else {
                    // Horizontal orientation
                    top = imageWidth * 0.8567961165048543; // position of max value
                    bottom = imageWidth * 0.12864077669902912;
                    fullSize = top - bottom;
                    ledWidth2 = imageWidth * 0.0121359223 / 2;
                }

                do {
                    sectionIndex--;
                    sectionPixels.push({start: (((section[sectionIndex].start + Math.abs(minValue)) / (maxValue - minValue)) * fullSize - ledWidth2),
                                         stop: (((section[sectionIndex].stop + Math.abs(minValue)) / (maxValue - minValue)) * fullSize - ledWidth2),
                                        color: customColorDef(section[sectionIndex].color)});
                } while (0 < sectionIndex);
            }

            // Create foreground in foreground buffer (foregroundBuffer)
            if (drawForeground) {
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
                    activeLedBuffer.width = width * 0.1214285714;
                    activeLedBuffer.height = height * 0.0121359223;
                } else {
                    activeLedBuffer.width = width * 0.0121359223;
                    activeLedBuffer.height = height * 0.1214285714;
                }
                activeLedContext = activeLedBuffer.getContext('2d');

                // Buffer for active bargraph led
                if (vertical) {
                    inActiveLedBuffer.width = width * 0.1214285714;
                    inActiveLedBuffer.height = height * 0.0121359223;
                } else {
                    inActiveLedBuffer.width = width * 0.0121359223;
                    inActiveLedBuffer.height = height * 0.1214285714;
                }
                inActiveLedContext = inActiveLedBuffer.getContext('2d');
            }

            if (resetLed) {
                ledBufferOn.width = Math.ceil(width * 0.0934579439);
                ledBufferOn.height = Math.ceil(height * 0.0934579439);
                ledContextOn = ledBufferOn.getContext('2d');

                ledBufferOff.width = Math.ceil(width * 0.0934579439);
                ledBufferOff.height = Math.ceil(height * 0.0934579439);
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
                top =  imageHeight * 0.12864077669902912; // position of max value
                bottom = imageHeight * 0.8567961165048543; // position of min value
                fullSize = bottom - top;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = top + fullSize - valueSize;
                valueBackgroundStartX = 0;
                valueBackgroundStartY = top;
                valueBackgroundStopX = 0;
                valueBackgroundStopY = top + fullSize;
            } else {
                // Horizontal orientation
                top = imageWidth * 0.8567961165048543; // position of max value
                bottom = imageWidth * 0.12864077669902912;
                fullSize = top - bottom;
                valueSize = fullSize * (value - minValue) / (maxValue - minValue);
                valueTop = bottom;
                valueBackgroundStartX = imageWidth * 0.14285714285714285;
                valueBackgroundStartY = imageHeight * 0.4357142857142857;
                valueBackgroundStopX = valueBackgroundStartX + fullSize;
                valueBackgroundStopY = valueBackgroundStartY + imageHeight * 0.14285714285714285;
            }

            var valueBackgroundTrackGradient = ctx.createLinearGradient(valueBackgroundStartX, valueBackgroundStartY, valueBackgroundStopX, valueBackgroundStopY);
            labelColor.setAlpha(0.0470588235);
            valueBackgroundTrackGradient.addColorStop(0.0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.1450980392);
            valueBackgroundTrackGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.1490196078);
            valueBackgroundTrackGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.0470588235);
            valueBackgroundTrackGradient.addColorStop(1.0, labelColor.getRgbaColor());
            ctx.fillStyle = valueBackgroundTrackGradient;

            if (vertical) {
                ctx.fillRect(imageWidth * 0.4357142857142857, top, imageWidth * 0.14285714285714285, fullSize);
            } else {
                ctx.fillRect(valueBackgroundStartX, valueBackgroundStartY, fullSize, imageHeight * 0.14285714285714285);
            }

            if (vertical) {
                // Vertical orientation
                valueBorderStartX = 0;
                valueBorderStartY = top;
                valueBorderStopX = 0;
                valueBorderStopY = top + fullSize;
            } else {
                // Horizontal orientation                ;
                valueBorderStartX = valueBackgroundStartX;
                valueBorderStartY = 0;
                valueBorderStopX = valueBackgroundStopX;
                valueBorderStopY = 0;
            }

            var valueBorderGradient = ctx.createLinearGradient(valueBorderStartX, valueBorderStartY, valueBorderStopX, valueBorderStopY);
            labelColor.setAlpha(0.2980392157);
            valueBorderGradient.addColorStop(0.0, labelColor.getRgbaColor());
            labelColor.setAlpha(0.6862745098);
            valueBorderGradient.addColorStop(0.48, labelColor.getRgbaColor());
            labelColor.setAlpha(0.6980392157);
            valueBorderGradient.addColorStop(0.49, labelColor.getRgbaColor());
            labelColor.setAlpha(0.4);
            valueBorderGradient.addColorStop(1.0, labelColor.getRgbaColor());
            ctx.fillStyle = valueBorderGradient;
            if (vertical) {
                ctx.fillRect(imageWidth * 0.4357142857142857, top, imageWidth * 0.007142857142857143, fullSize);
                ctx.fillRect(imageWidth * 0.5714285714285714, top, imageWidth * 0.007142857142857143, fullSize);
            } else {
                ctx.fillRect(imageWidth * 0.14285714285714285, imageHeight * 0.4357142857, fullSize, imageHeight * 0.007142857142857143);
                ctx.fillRect(imageWidth * 0.14285714285714285, imageHeight * 0.5714285714, fullSize, imageHeight * 0.007142857142857143);
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
                ledY = imageHeight * 0.8519417476;
                ledW = imageWidth * 0.1214285714;
                ledH = imageHeight * 0.0121359223;
                ledCenterX = (ledX + ledW) / 2;
                ledCenterY = (ledY + ledH) / 2;
            } else {
                // HORIZONTAL
                ledX = imageWidth * 0.14285714285714285;
                //ledX = imageWidth * 0.3;
                ledY = imageHeight * 0.45;
                ledW = imageWidth * 0.0121359223;
                ledH = imageHeight * 0.1214285714;
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
                if (0 !== value) {
                    activeLeds = ((value + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                    for (translateY = 0 ; translateY <= activeLeds ; translateY += ledH + 1) {
                        //check for LED color
                        activeLedColor = valueColor;
                        if (isSectionsVisible) {
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
                if (0 !== value) {
                    activeLeds = ((value + Math.abs(minValue)) / (maxValue - minValue)) * fullSize;
                    for (translateX = -(ledW / 2) ; translateX <= activeLeds ; translateX += ledW + 1) {
                        //check for LED color
                        activeLedColor = valueColor;
                        if (isSectionsVisible) {
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
            ledGradient.addColorStop(0.0, 'rgb(60, 60, 60)');
            ledGradient.addColorStop(1.0, 'rgb(50, 50, 50)');
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
            ledGradient.addColorStop(0.0, color.light.getRgbaColor());
            ledGradient.addColorStop(1.0, color.dark.getRgbaColor());
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
            mainCtx.drawImage(frameBuffer, 0, 0);

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
            var valuePos;
            // Draw min measured value indicator
            if (minMeasuredValueVisible) {

                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (minMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth * 0.05) / 2.0 + 1);
                } else {
                    valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * minMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.05) / 2.0 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(minMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            // Draw max measured value indicator
            if (maxMeasuredValueVisible) {
                mainCtx.save();
                if (vertical) {
                    valuePos = imageHeight * 0.8567961165048543 - (imageHeight * 0.7281553398) * (maxMeasuredValue / (maxValue - minValue));
                    mainCtx.translate(imageWidth * 0.37 - Math.ceil(imageWidth * 0.05) - 2, valuePos - Math.ceil(imageWidth) * 0.05 / 2.0 + 1);
                } else {
                    valuePos = ((imageWidth * 0.8567961165048543) - (imageWidth * 0.12864077669902912)) * maxMeasuredValue / (maxValue - minValue);
                    mainCtx.translate(imageWidth * 0.14285714285714285 - Math.ceil(imageHeight * 0.05) / 2.0 + valuePos, imageHeight * 0.63 + 2);
                }
                mainCtx.drawImage(maxMeasuredValueBuffer, 0, 0);
                mainCtx.restore();
            }

            mainCtx.save();
            drawValue(mainCtx, imageWidth, imageHeight);
            mainCtx.restore();

            // Draw foreground
            mainCtx.drawImage(foregroundBuffer, 0, 0);
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

//        var oldValue;
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

        var stdFont = Math.floor(imageHeight / 1.5) + 'px sans-serif';
        var lcdFont = Math.floor(imageHeight / 1.5) + 'px LCDMono2Ultra';

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
            // Define the clipping area
            //roundedRectangle(mainCtx, 2, 2, imageWidth - 4, imageHeight - 4, Math.min(imageWidth, imageHeight) * 0.05);

            mainCtx.beginPath();
            mainCtx.rect(2, 2, imageWidth - 4, imageHeight - 4);
            mainCtx.closePath();
            mainCtx.clip();

            if (valuesNumeric) {
                // Numeric value
                mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
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
                mainCtx.fillText(lcdText, imageWidth - unitWidth - 4 - scrollX, imageHeight * 0.5);

                if (unitStringVisible) {
                    mainCtx.font = Math.floor(imageHeight / 2.5) + 'px sans-serif';
                    mainCtx.fillText(unitString, imageWidth - 2 - scrollX, imageHeight * 0.58);
                }
            } else {
                // Text value
                if (digitalFont) {
                    mainCtx.font = lcdFont;
                } else {
                    mainCtx.font = stdFont;
                }
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
                mainCtx.fillText(value, imageWidth - 2 - scrollX, imageHeight * 0.5);
            }
            mainCtx.restore();
        };

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

            // Draw lcd background
            mainCtx.drawImage(lcdBuffer, 0, 0);

            // Draw lcd text
            drawLcdText(value);
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
        var lcdFont = Math.floor(imageHeight / 1.875) + 'px LCDMono2Ultra';
        var stdOldFont = Math.floor(imageHeight / 3.5) + 'px sans-serif';
        var lcdOldFont = Math.floor(imageHeight / 3.5) + 'px LCDMono2Ultra';

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
                    mainCtx.font = Math.floor(imageHeight / 3.0) + 'px sans-serif';
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
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);

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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

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
            ctx.moveTo(imageWidth * 0.20093457943925233, imageHeight * 0.43457943925233644);
            ctx.lineTo(imageWidth * 0.16355140186915887, imageHeight * 0.43457943925233644);
            ctx.lineTo(imageWidth * 0.16355140186915887, imageHeight * 0.5607476635514018);
            ctx.lineTo(imageWidth * 0.20093457943925233, imageHeight * 0.5607476635514018);
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.stroke();

            // TRIANGLELEFT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.16355140186915887, imageHeight * 0.4719626168224299);
            ctx.lineTo(imageWidth * 0.205607476635514, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.16355140186915887, imageHeight * 0.5233644859813084);
            ctx.lineTo(imageWidth * 0.16355140186915887, imageHeight * 0.4719626168224299);
            ctx.closePath();
            ctx.fill();

            // FRAMERIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.7990654205607477, imageHeight * 0.43457943925233644);
            ctx.lineTo(imageWidth * 0.8364485981308412, imageHeight * 0.43457943925233644);
            ctx.lineTo(imageWidth * 0.8364485981308412, imageHeight * 0.5607476635514018);
            ctx.lineTo(imageWidth * 0.7990654205607477, imageHeight * 0.5607476635514018);
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.stroke();

            // TRIANGLERIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.8364485981308412, imageHeight * 0.4719626168224299);
            ctx.lineTo(imageWidth * 0.794392523364486, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.8364485981308412, imageHeight * 0.5233644859813084);
            ctx.lineTo(imageWidth * 0.8364485981308412, imageHeight * 0.4719626168224299);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        var drawPointerImage = function(ctx) {
            ctx.save();

            // POINTER_LEVEL
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.5233644859813084, imageHeight * 0.35046728971962615);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.1308411214953271);
            ctx.lineTo(imageWidth * 0.4766355140186916, imageHeight * 0.35046728971962615);
            ctx.bezierCurveTo(imageWidth * 0.4766355140186916, imageHeight * 0.35046728971962615, imageWidth * 0.49065420560747663, imageHeight * 0.34579439252336447, imageWidth * 0.5, imageHeight * 0.34579439252336447);
            ctx.bezierCurveTo(imageWidth * 0.5093457943925234, imageHeight * 0.34579439252336447, imageWidth * 0.5233644859813084, imageHeight * 0.35046728971962615, imageWidth * 0.5233644859813084, imageHeight * 0.35046728971962615);
            ctx.closePath();
            var POINTER_LEVEL_GRADIENT = ctx.createLinearGradient((0.4953271028037383 * imageWidth), (0.1542056074766355 * imageHeight), ((0.4953271028037383 + 1.2017562047707671E-17) * imageWidth), ((0.1542056074766355 + 0.19626168224299065) * imageHeight));
            var tmpDarkColor = pointerColor.dark;
            var tmpLightColor = pointerColor.light;
            tmpDarkColor.setAlpha(0.70588);
            tmpLightColor.setAlpha(0.70588);
            POINTER_LEVEL_GRADIENT.addColorStop(0.0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_GRADIENT.addColorStop(1.0, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_GRADIENT;
            var strokeColor_POINTER_LEVEL = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL;
            ctx.fill();
            ctx.stroke();

            tmpDarkColor.setAlpha(1.0);
            tmpLightColor.setAlpha(1.0);

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
            ctx.moveTo(imageWidth * 0.2850467289719626, imageHeight * 0.514018691588785);
            ctx.lineTo(imageWidth * 0.2102803738317757, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.2850467289719626, imageHeight * 0.48130841121495327);
            ctx.bezierCurveTo(imageWidth * 0.2850467289719626, imageHeight * 0.48130841121495327, imageWidth * 0.2803738317757009, imageHeight * 0.49065420560747663, imageWidth * 0.2803738317757009, imageHeight * 0.4953271028037383);
            ctx.bezierCurveTo(imageWidth * 0.2803738317757009, imageHeight * 0.5046728971962616, imageWidth * 0.2850467289719626, imageHeight * 0.514018691588785, imageWidth * 0.2850467289719626, imageHeight * 0.514018691588785);
            ctx.closePath();
            var POINTER_LEVEL_LEFT_GRADIENT = ctx.createLinearGradient((0.22429906542056074 * imageWidth), (0.4953271028037383 * imageHeight), ((0.22429906542056074 + 0.06542056074766354) * imageWidth), ((0.4953271028037383) * imageHeight));
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0.0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_LEFT_GRADIENT.addColorStop(1.0, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_LEFT_GRADIENT;
            var strokeColor_POINTER_LEVEL_LEFT = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL_LEFT;
            ctx.fill();
            ctx.stroke();

            // POINTER_LEVEL_RIGHT
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.7149532710280374, imageHeight * 0.514018691588785);
            ctx.lineTo(imageWidth * 0.7897196261682243, imageHeight * 0.5);
            ctx.lineTo(imageWidth * 0.7149532710280374, imageHeight * 0.48130841121495327);
            ctx.bezierCurveTo(imageWidth * 0.7149532710280374, imageHeight * 0.48130841121495327, imageWidth * 0.719626168224299, imageHeight * 0.49065420560747663, imageWidth * 0.719626168224299, imageHeight * 0.4953271028037383);
            ctx.bezierCurveTo(imageWidth * 0.719626168224299, imageHeight * 0.5046728971962616, imageWidth * 0.7149532710280374, imageHeight * 0.514018691588785, imageWidth * 0.7149532710280374, imageHeight * 0.514018691588785);
            ctx.closePath();
            var POINTER_LEVEL_RIGHT_GRADIENT = ctx.createLinearGradient((0.7757009345794392 * imageWidth), (0.4953271028037383 * imageHeight), ((0.7757009345794392 - 0.06542056074766354) * imageWidth), ((0.4953271028037383 + 8.011708031805115E-18) * imageHeight));
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0.0, tmpDarkColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0.3, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(0.59, tmpLightColor.getRgbaColor());
            POINTER_LEVEL_RIGHT_GRADIENT.addColorStop(1.0, tmpDarkColor.getRgbaColor());
            ctx.fillStyle = POINTER_LEVEL_RIGHT_GRADIENT;
            var strokeColor_POINTER_LEVEL_RIGHT = pointerColor.light.getRgbaColor();
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
            ctx.strokeStyle = strokeColor_POINTER_LEVEL_RIGHT;
            ctx.fill();
            ctx.stroke();

            tmpDarkColor.setAlpha(1.0);
            tmpLightColor.setAlpha(1.0);

            ctx.restore();
        };

        // **************   Initialization  ********************
        // Draw all static painting code to background
        var init = function() {
            initialized = true;

            if (frameVisible) {
                drawRadialFrameImage(backgroundContext, frameDesign, centerX, centerY, imageWidth, imageHeight);
            }

            drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);

            drawTickmarksImage(backgroundContext);

            drawMarkerImage(pointerContext);

            drawPointerImage(pointerContext);

            drawStepPointerImage(stepPointerContext);

            drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, false);
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
            mainCtx.drawImage(backgroundBuffer, 0, 0);

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
            mainCtx.drawImage(foregroundBuffer, 0, 0);

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
        var pointerType = (undefined === parameters.pointerType ? steelseries.PointerType.TYPE2 : parameters.pointerType);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

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
//            var stdFont = 0.12 * imageWidth + 'px serif';
//            var smlFont = 0.06 * imageWidth + 'px serif';

            ctx.save();
            //ctx.strokeStyle = '#83827E';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);

            if (!degreeScale) {

                stdFont = 0.12 * imageWidth + 'px serif';
                smlFont = 0.06 * imageWidth + 'px serif';

                //var angleStep = 2 * Math.PI / 360;

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
                        ctx.lineWidth = 1.0;
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
                    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                    ctx.shadowBlur = 3;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            }

            switch (pointerType.type) {
                case "type2":
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5327102803738317, imageHeight * 0.4532710280373832);
                    ctx.bezierCurveTo(imageWidth * 0.5327102803738317, imageHeight * 0.4532710280373832, imageWidth * 0.5, imageHeight * 0.14953271028037382, imageWidth * 0.5, imageHeight * 0.14953271028037382);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.14953271028037382, imageWidth * 0.4672897196261682, imageHeight * 0.4532710280373832, imageWidth * 0.4672897196261682, imageHeight * 0.4532710280373832);
                    ctx.bezierCurveTo(imageWidth * 0.4532710280373832, imageHeight * 0.46261682242990654, imageWidth * 0.4439252336448598, imageHeight * 0.48130841121495327, imageWidth * 0.4439252336448598, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.4439252336448598, imageHeight * 0.5, imageWidth * 0.5560747663551402, imageHeight * 0.5, imageWidth * 0.5560747663551402, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.5560747663551402, imageHeight * 0.48130841121495327, imageWidth * 0.5467289719626168, imageHeight * 0.46261682242990654, imageWidth * 0.5327102803738317, imageHeight * 0.4532710280373832);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER2_GRADIENT = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.49065420560747663 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), (0.49065420560747663 * imageHeight));
                        NORTHPOINTER2_GRADIENT.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER2_GRADIENT.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER2_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();

                    // SOUTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.4672897196261682, imageHeight * 0.5467289719626168);
                    ctx.bezierCurveTo(imageWidth * 0.4672897196261682, imageHeight * 0.5467289719626168, imageWidth * 0.5, imageHeight * 0.8504672897196262, imageWidth * 0.5, imageHeight * 0.8504672897196262);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.8504672897196262, imageWidth * 0.5327102803738317, imageHeight * 0.5467289719626168, imageWidth * 0.5327102803738317, imageHeight * 0.5467289719626168);
                    ctx.bezierCurveTo(imageWidth * 0.5467289719626168, imageHeight * 0.5373831775700935, imageWidth * 0.5560747663551402, imageHeight * 0.5186915887850467, imageWidth * 0.5560747663551402, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.5560747663551402, imageHeight * 0.5, imageWidth * 0.4439252336448598, imageHeight * 0.5, imageWidth * 0.4439252336448598, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.4439252336448598, imageHeight * 0.5186915887850467, imageWidth * 0.4532710280373832, imageHeight * 0.5373831775700935, imageWidth * 0.4672897196261682, imageHeight * 0.5467289719626168);
                    ctx.closePath();
                    if (!shadow) {
                        var SOUTHPOINTER2_GRADIENT = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.5093457943925234 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), (0.5093457943925234 * imageHeight));
                        SOUTHPOINTER2_GRADIENT.addColorStop(0.0, 'rgba(227, 229, 232, 1.0)');
                        SOUTHPOINTER2_GRADIENT.addColorStop(0.48, 'rgba(227, 229, 232, 1.0)');
                        SOUTHPOINTER2_GRADIENT.addColorStop(0.48009998, 'rgba(171, 177, 184, 1.0)');
                        SOUTHPOINTER2_GRADIENT.addColorStop(1.0, 'rgba(171, 177, 184, 1.0)');
                        ctx.fillStyle = SOUTHPOINTER2_GRADIENT;
                        var strokeColor_SOUTHPOINTER2 = '#ABB1B8';
                        ctx.strokeStyle = strokeColor_SOUTHPOINTER2;
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                    break;

                case "type3":
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.14953271028037382);
                    ctx.bezierCurveTo(imageWidth * 0.5, imageHeight * 0.14953271028037382, imageWidth * 0.4439252336448598, imageHeight * 0.49065420560747663, imageWidth * 0.4439252336448598, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.4439252336448598, imageHeight * 0.5327102803738317, imageWidth * 0.4672897196261682, imageHeight * 0.5560747663551402, imageWidth * 0.5, imageHeight * 0.5560747663551402);
                    ctx.bezierCurveTo(imageWidth * 0.5327102803738317, imageHeight * 0.5560747663551402, imageWidth * 0.5560747663551402, imageHeight * 0.5327102803738317, imageWidth * 0.5560747663551402, imageHeight * 0.5);
                    ctx.bezierCurveTo(imageWidth * 0.5560747663551402, imageHeight * 0.49065420560747663, imageWidth * 0.5, imageHeight * 0.14953271028037382, imageWidth * 0.5, imageHeight * 0.14953271028037382);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER3_GRADIENT = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.49065420560747663 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), (0.49065420560747663 * imageHeight));
                        NORTHPOINTER3_GRADIENT.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER3_GRADIENT.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER3_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                    break;

                case "type1:":
                default:
                    // NORTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.4953271028037383);
                    ctx.lineTo(imageWidth * 0.5280373831775701, imageHeight * 0.4953271028037383);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.14953271028037382);
                    ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.4953271028037383);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.4953271028037383);
                    ctx.closePath();
                    if (!shadow) {
                        var NORTHPOINTER1_GRADIENT = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.49065420560747663 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), ((0.49065420560747663) * imageHeight));
                        NORTHPOINTER1_GRADIENT.addColorStop(0.0, pointerColor.light.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(0.46, pointerColor.light.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(0.47, pointerColor.medium.getRgbaColor());
                        NORTHPOINTER1_GRADIENT.addColorStop(1.0, pointerColor.medium.getRgbaColor());
                        ctx.fillStyle = NORTHPOINTER1_GRADIENT;
                        ctx.strokeStyle = pointerColor.dark.getRgbaColor();
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();

                    // SOUTHPOINTER
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.5046728971962616);
                    ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.5046728971962616);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.8504672897196262);
                    ctx.lineTo(imageWidth * 0.5280373831775701, imageHeight * 0.5046728971962616);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.5046728971962616);
                    ctx.closePath();
                    if (!shadow) {
                        var SOUTHPOINTER1_GRADIENT = ctx.createLinearGradient((0.4719626168224299 * imageWidth), (0.5093457943925234 * imageHeight), ((0.4719626168224299 + 0.056074766355140186) * imageWidth), ((0.5093457943925234) * imageHeight));
                        SOUTHPOINTER1_GRADIENT.addColorStop(0.0, 'rgba(227, 229, 232, 1.0)');
                        SOUTHPOINTER1_GRADIENT.addColorStop(0.48, 'rgba(227, 229, 232, 1.0)');
                        SOUTHPOINTER1_GRADIENT.addColorStop(0.48009998, 'rgba(171, 177, 184, 1.0)');
                        SOUTHPOINTER1_GRADIENT.addColorStop(1.0, 'rgba(171, 177, 184, 1.0)');
                        ctx.fillStyle = SOUTHPOINTER1_GRADIENT;
                        var strokeColor_SOUTHPOINTER = '#ABB1B8';
                        ctx.strokeStyle = strokeColor_SOUTHPOINTER;
                    }
                    ctx.lineWidth = 1.0;
                    ctx.lineCap = 'square';
                    ctx.lineJoin = 'miter';
                    ctx.fill();
                    ctx.stroke();
                break;
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

            drawRadialBackgroundImage(backgroundContext, backgroundColor, centerX, centerY, imageWidth, imageHeight);
            drawRadialCustomImage(backgroundContext, customLayer, centerX, centerY, imageWidth, imageHeight);
            if (roseVisible) {
                drawRoseImage(backgroundContext, centerX, centerY, imageWidth, imageHeight, backgroundColor);
            //drawSymbolImage(backgroundContext);
            }

            drawTickmarksImage(backgroundContext);

            drawPointerImage(pointerContext, false);
            drawPointerImage(pointerShadowContext, true);

            drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle);
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

            mainCtx.drawImage(backgroundBuffer, 0, 0);

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

            mainCtx.drawImage(foregroundBuffer, 0, 0);

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
        var pointerTypeLatest = (undefined === parameters.pointerTypeLatest ? steelseries.PointerType.TYPE1 : parameters.pointerTypeLatest);
        var pointerTypeAverage = (undefined === parameters.pointerTypeAverage ? steelseries.PointerType.TYPE7 : parameters.pointerTypeAverage);
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.RED : parameters.pointerColor);
        var pointerColorAverage = (undefined === parameters.pointerColorAverage ? steelseries.ColorDef.BLUE : parameters.pointerColorAverage);
        var knobType = (undefined === parameters.knobType ? steelseries.KnobType.STANDARD_KNOB : parameters.knobType);
        var knobStyle = (undefined === parameters.knobStyle ? steelseries.KnobStyle.SILVER : parameters.knobStyle);
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

        var stdFont = Math.floor(imageWidth / 10) + 'px sans-serif';
        var lcdFont = Math.floor(imageWidth / 10) + 'px LCDMono2Ultra';

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
            mainCtx.textBaseline = 'middle';
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
                mainCtx.shadowBlur = imageWidth * 0.01;
            }
            if (digitalFont) {
                mainCtx.font = lcdFont;
            } else {
                mainCtx.font = stdFont;
            }
            if (bLatest) {
                mainCtx.fillText(value + "\u00B0", imageWidth / 2 + 2, imageWidth * 0.385, imageWidth * 0.4);
            } else {
                mainCtx.fillText(value + "\u00B0", imageWidth / 2 + 2, imageWidth * 0.63, imageWidth * 0.4);
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
            ctx.moveTo(0, 0);
            ctx.closePath();
            if (filled) {
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
//            var stdFont = 0.12 * imageWidth + 'px serif';
//            var smlFont = 0.06 * imageWidth + 'px serif';

            ctx.save();
            //ctx.strokeStyle = '#83827E';
            ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
            ctx.translate(centerX, centerY);

            if (!degreeScale) {

                stdFont = 0.12 * imageWidth + 'px serif';
                smlFont = 0.06 * imageWidth + 'px serif';

                //var angleStep = 2 * Math.PI / 360;

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
                        case 0: //E
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[2], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 45: //SE
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[3], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 90: //S
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[4], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 135: //SW
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[5], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 180: //W
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[6], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 225: //NW
                            ctx.translate(imageWidth * 0.29, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = smlFont;
                            ctx.fillText(pointSymbols[7], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.29, 0);
                            break;
                        case 270: //N
                            ctx.translate(imageWidth * 0.35, 0);
                            ctx.rotate(Math.PI/2);
                            ctx.font = stdFont;
                            ctx.fillText(pointSymbols[0], 0, 0, imageWidth);
                            ctx.translate(-imageWidth * 0.35, 0);
                            break;
                        case 315: //NE
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
                        ctx.lineWidth = 1.0;
                        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
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
                                ctx.lineWidth = ((i+90)%5) ? 1.5 : 1.0;
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
//                                ctx.translate(imageWidth * 0.37, 0);
                                ctx.translate(TEXT_TRANSLATE_X, 0);
                                ctx.rotate(Math.PI/2);
                                ctx.font = smlFont;
                                ctx.fillText(("0".substring(val>=100) + val), 0, 0, TEXT_WIDTH);
//                                ctx.translate(-imageWidth * 0.37, 0);
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
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
                ctx.font = 0.040 * imageWidth + 'px sans-serif';
                var titleWidth = ctx.measureText(lcdTitleStrings[0]).width;
                ctx.fillText(lcdTitleStrings[0], (imageWidth - titleWidth) / 2.0, imageHeight * 0.27, imageWidth * 0.3);
                titleWidth = ctx.measureText(lcdTitleStrings[1]).width;
                ctx.fillText(lcdTitleStrings[1], (imageWidth - titleWidth) / 2.0, imageHeight * 0.73, imageWidth * 0.3);
                if (titleString.length > 0) {
                    ctx.font = 0.0467 * imageWidth + 'px sans-serif';
                    titleWidth = ctx.measureText(titleString).width;
                    ctx.fillText(titleString, (imageWidth - titleWidth) / 2.0, imageHeight * 0.5, imageWidth * 0.3);
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

            if (drawBackground) {
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

                if (roseVisible) {
                    drawRoseImage(backgroundContext, centerX, centerY, imageWidth, imageHeight, backgroundColor);
                //drawSymbolImage(backgroundContext);
                }

                drawTickmarksImage(backgroundContext);

                // Create lcd background if selected in background buffer (backgroundBuffer)
                if (lcdVisible) {
                    lcdBuffer = createLcdBackgroundImage(imageWidth * 0.3, imageHeight * 0.15, lcdColor);
                    backgroundContext.drawImage(lcdBuffer, (imageWidth - (imageWidth * 0.3)) / 2, imageHeight * 0.55);
                    backgroundContext.drawImage(lcdBuffer, (imageWidth - (imageWidth * 0.3)) / 2, imageHeight * 0.305);
                    // Create title in background buffer (backgroundBuffer)
                    drawLcdTitles(backgroundContext);
                }
            }

            if (drawPointer) {
                drawPointerImage(pointerContextAverage, imageWidth, pointerTypeAverage, pointerColorAverage, backgroundColor.labelColor);
                drawPointerImage(pointerShadowContextAverage, imageWidth, pointerTypeAverage, pointerColor, backgroundColor.labelColor, true);
                drawPointerImage(pointerContextLatest, imageWidth, pointerTypeLatest, pointerColor, backgroundColor.labelColor);
                drawPointerImage(pointerShadowContextLatest, imageWidth, pointerTypeLatest, pointerColor, backgroundColor.labelColor, true);
            }

            if (drawForeground) {
                drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle);
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
            newValue = newValue % 360;
            if (valueLatest !== newValue) {
                valueLatest = newValue;
                this.repaint();
            }
        };

        this.getValueLatest = function() {
            return valueLatest;
        };

        this.setValueAverage = function(newValue) {
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
            var targetValue = newValue % 360;
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
                tweenLatest.start();
            }
        };

        this.setValueAnimatedAverage = function(newValue) {
            var targetValue = newValue % 360;
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
                tweenAverage.start();
            }
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

        this.setFrameDesign = function(newFrameDesign) {
            resetBuffers({background: true});
            frameDesign = newFrameDesign;
            init({frame: true,
                  background: true});
            this.repaint();
        };

        this.setBackgroundColor = function(newBackgroundColor) {
            resetBuffers();
            backgroundColor = newBackgroundColor;
            init({background: true});
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
            resetBuffers({background: true});
            pointSymbols = newPointSymbols;
            init({background: true});
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

            mainCtx.drawImage(backgroundBuffer, 0, 0);

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

            mainCtx.drawImage(foregroundBuffer, 0, 0);

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
        var pointerColor = (undefined === parameters.pointerColor ? steelseries.ColorDef.WHITE : parameters.pointerColor);

        var tweenRoll;
        var tweenPitch;
        var roll = 0;
        var pitch = 0;
        var pitchPixel = (Math.PI * size) / 360.0;
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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

        var initialized = false;

        // **************   Buffer creation  ********************
        // Buffer for all static background painting code
        var backgroundBuffer = createBuffer(size, size);
        var backgroundContext = backgroundBuffer.getContext('2d');

        // Buffer for pointer image painting code
        var valueBuffer = createBuffer(size, size * Math.PI);
        var valueContext = valueBuffer.getContext('2d');

        // Buffer for indicator painting code
        var indicatorBuffer = createBuffer(size * 0.0373831776, size * 0.0560747664);
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
            HORIZON_GRADIENT.addColorStop(0.0, 'rgba(127, 213, 240, 1.0)');
            HORIZON_GRADIENT.addColorStop(0.5, 'rgba(127, 213, 240, 1.0)');
            HORIZON_GRADIENT.addColorStop(0.5, 'rgba(60, 68, 57, 1.0)');
            HORIZON_GRADIENT.addColorStop(1.0, 'rgba(60, 68, 57, 1.0)');
            ctx.fillStyle = HORIZON_GRADIENT;
            ctx.fill();

            ctx.lineWidth = 1.0;
            var stepSizeY = imgHeight / 360.0 * 5.0;
            var stepTen = false;
            var step = 10;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var fontSize = imgWidth * 0.04;
            ctx.font = fontSize + 'px sans-serif';
            ctx.fillStyle = 'rgb(55, 89, 110)';
            for (y = imgHeight / 2.0 - stepSizeY; y > 0; y -= stepSizeY) {
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
            ctx.lineWidth = 1.0;
            for (y = imgHeight / 2.0 + stepSizeY; y <= imgHeight; y += stepSizeY) {
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
            ctx.moveTo(imageWidth * 0.4766355140186916, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.4766355140186916, imageHeight * 0.514018691588785, imageWidth * 0.48598130841121495, imageHeight * 0.5233644859813084, imageWidth * 0.5, imageHeight * 0.5233644859813084);
            ctx.bezierCurveTo(imageWidth * 0.514018691588785, imageHeight * 0.5233644859813084, imageWidth * 0.5233644859813084, imageHeight * 0.514018691588785, imageWidth * 0.5233644859813084, imageHeight * 0.5);
            ctx.bezierCurveTo(imageWidth * 0.5233644859813084, imageHeight * 0.48598130841121495, imageWidth * 0.514018691588785, imageHeight * 0.4766355140186916, imageWidth * 0.5, imageHeight * 0.4766355140186916);
            ctx.bezierCurveTo(imageWidth * 0.48598130841121495, imageHeight * 0.4766355140186916, imageWidth * 0.4766355140186916, imageHeight * 0.48598130841121495, imageWidth * 0.4766355140186916, imageHeight * 0.5);
            ctx.closePath();
            ctx.moveTo(imageWidth * 0.4158878504672897, imageHeight * 0.5046728971962616);
            ctx.lineTo(imageWidth * 0.4158878504672897, imageHeight * 0.4953271028037383);
            ctx.bezierCurveTo(imageWidth * 0.4158878504672897, imageHeight * 0.4953271028037383, imageWidth * 0.4672897196261682, imageHeight * 0.4953271028037383, imageWidth * 0.4672897196261682, imageHeight * 0.4953271028037383);
            ctx.bezierCurveTo(imageWidth * 0.4719626168224299, imageHeight * 0.48130841121495327, imageWidth * 0.48130841121495327, imageHeight * 0.4719626168224299, imageWidth * 0.4953271028037383, imageHeight * 0.4672897196261682);
            ctx.bezierCurveTo(imageWidth * 0.4953271028037383, imageHeight * 0.4672897196261682, imageWidth * 0.4953271028037383, imageHeight * 0.4158878504672897, imageWidth * 0.4953271028037383, imageHeight * 0.4158878504672897);
            ctx.lineTo(imageWidth * 0.5046728971962616, imageHeight * 0.4158878504672897);
            ctx.bezierCurveTo(imageWidth * 0.5046728971962616, imageHeight * 0.4158878504672897, imageWidth * 0.5046728971962616, imageHeight * 0.4672897196261682, imageWidth * 0.5046728971962616, imageHeight * 0.4672897196261682);
            ctx.bezierCurveTo(imageWidth * 0.5186915887850467, imageHeight * 0.4719626168224299, imageWidth * 0.5280373831775701, imageHeight * 0.48130841121495327, imageWidth * 0.5327102803738317, imageHeight * 0.4953271028037383);
            ctx.bezierCurveTo(imageWidth * 0.5327102803738317, imageHeight * 0.4953271028037383, imageWidth * 0.5841121495327103, imageHeight * 0.4953271028037383, imageWidth * 0.5841121495327103, imageHeight * 0.4953271028037383);
            ctx.lineTo(imageWidth * 0.5841121495327103, imageHeight * 0.5046728971962616);
            ctx.bezierCurveTo(imageWidth * 0.5841121495327103, imageHeight * 0.5046728971962616, imageWidth * 0.5327102803738317, imageHeight * 0.5046728971962616, imageWidth * 0.5327102803738317, imageHeight * 0.5046728971962616);
            ctx.bezierCurveTo(imageWidth * 0.5280373831775701, imageHeight * 0.5186915887850467, imageWidth * 0.5186915887850467, imageHeight * 0.5327102803738317, imageWidth * 0.5, imageHeight * 0.5327102803738317);
            ctx.bezierCurveTo(imageWidth * 0.48130841121495327, imageHeight * 0.5327102803738317, imageWidth * 0.4719626168224299, imageHeight * 0.5186915887850467, imageWidth * 0.4672897196261682, imageHeight * 0.5046728971962616);
            ctx.bezierCurveTo(imageWidth * 0.4672897196261682, imageHeight * 0.5046728971962616, imageWidth * 0.4158878504672897, imageHeight * 0.5046728971962616, imageWidth * 0.4158878504672897, imageHeight * 0.5046728971962616);
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
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.08878504672897196);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.113);
                    ctx.closePath();
                    ctx.stroke();
                } else if (angle % 15 === 0) {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.08878504672897196);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.1037850467);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5, imageHeight * 0.08878504672897196);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.0937850467);
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

            var imgWidth = imageWidth * 0.0373831776;
            var imgHeight = imageHeight * 0.0560747664;

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

            drawRadialForegroundImage(foregroundContext, foregroundType, imageWidth, imageHeight, true, knobType, knobStyle, gaugeType);
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
            indicatorBuffer.width = size * 0.0373831776;
            indicatorBuffer.height = size * 0.0560747664;
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
            mainCtx.arc(centerX, centerY, imageWidth * 0.8317756652832031 / 2.0, 0, Math.PI * 2, true);
            mainCtx.closePath();
            mainCtx.clip();

            // Rotate around roll
            mainCtx.translate(centerX, centerY);
            mainCtx.rotate(-(roll * Math.PI / 180));
            mainCtx.translate(-centerX, 0);
            // Translate about dive
            mainCtx.translate(0, (pitch * pitchPixel));

            // Draw horizon
//            mainCtx.drawImage(valueBuffer, 0, ((imageHeight * 0.5 - valueBuffer.height) / 2.0));
            mainCtx.drawImage(valueBuffer, 0, -valueBuffer.height / 2.0);

            // Draw the scale and angle indicator
            mainCtx.translate(0, -(pitch * pitchPixel) - centerY);
            mainCtx.drawImage(indicatorBuffer, (imageWidth * 0.5 - indicatorBuffer.width / 2.0), (imageWidth * 0.10747663551401869));
            mainCtx.restore();

            mainCtx.drawImage(foregroundBuffer, 0, 0);

//            mainCtx.restore();
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
        var foregroundType = (undefined === parameters.foregroundType ? steelseries.ForegroundType.TYPE1 : parameters.foregroundType);
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

        var centerX = imageWidth / 2.0;
        var centerY = imageHeight / 2.0;

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
                    SMALL_TICK_HEIGHT = imageWidth * 0.0747663551;
                    INNER_POINT = OUTER_POINT - SMALL_TICK_HEIGHT;
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = imageWidth * 0.0140186916;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 30) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(30 * RAD_FACTOR);
                     }

                    // Draw hours tickmarks
                    BIG_TICK_HEIGHT = imageWidth * 0.1261682243;
                    INNER_POINT = OUTER_POINT - BIG_TICK_HEIGHT;
                    ctx.lineWidth = imageWidth * 0.0327102804;

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
                    SMALL_TICK_HEIGHT = imageWidth * 0.0373831776;
                    INNER_POINT = OUTER_POINT - SMALL_TICK_HEIGHT;
                    ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
                    ctx.lineWidth = imageWidth * 0.0093457944;

                    for (tickAngle = 0; tickAngle < 360; tickAngle += 6) {
                        ctx.beginPath();
                        ctx.moveTo(OUTER_POINT, 0);
                        ctx.lineTo(INNER_POINT, 0);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.rotate(6 * RAD_FACTOR);
                    }

                    // Draw hours tickmarks
                    BIG_TICK_HEIGHT = imageWidth * 0.0841121495;
                    INNER_POINT = OUTER_POINT - BIG_TICK_HEIGHT;
                    ctx.lineWidth = imageWidth * 0.0280373832;

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
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 3;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            }

            switch (ptrType.type) {
                case 'type2':
                    ctx.beginPath();
                    ctx.lineWidth = imageWidth * 0.046728972;
                    ctx.moveTo(centerX, imageWidth * 0.2897196262);
                    ctx.lineTo(centerX, imageWidth * 0.2897196262 + imageWidth * 0.2242990654);
                    if (!shadow) {
                        ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case 'type1':
                default:
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.4719626168224299, imageHeight * 0.5607476635514018);
                    ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.21495327102803738);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.1822429906542056);
                    ctx.lineTo(imageWidth * 0.5280373831775701, imageHeight * 0.21495327102803738);
                    ctx.lineTo(imageWidth * 0.5280373831775701, imageHeight * 0.5607476635514018);
                    ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.5607476635514018);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(imageWidth * 0.4719626168224299, imageHeight * 0.5607476635514018, imageWidth * 0.5280373831775701, imageHeight * 0.21495327102803738);
                        grad.addColorStop(1, pointerColor.veryLight.getRgbaColor());
                        grad.addColorStop(0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        };

        var drawMinutePointer = function(ctx, ptrType, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 3;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            }

            switch (ptrType.type) {
                case 'type2':
                    ctx.beginPath();
                    ctx.lineWidth = imageWidth * 0.0327102804;
                    ctx.moveTo(centerX, imageWidth * 0.1168224299);
                    ctx.lineTo(centerX, imageWidth * 0.1168224299 + imageWidth * 0.3878504673);
                    if (!shadow) {
                        ctx.strokeStyle = pointerColor.medium.getRgbaColor();
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;

                case 'type1':
                default:
                    ctx.beginPath();
                    ctx.moveTo(imageWidth * 0.5186915887850467, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.5233644859813084, imageHeight * 0.13551401869158877);
                    ctx.lineTo(imageWidth * 0.5, imageHeight * 0.10747663551401869);
                    ctx.lineTo(imageWidth * 0.4766355140186916, imageHeight * 0.14018691588785046);
                    ctx.lineTo(imageWidth * 0.4766355140186916, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.5186915887850467, imageHeight * 0.5747663551401869);
                    ctx.closePath();
                    if (!shadow) {
                        grad = ctx.createLinearGradient(imageWidth * 0.5186915887850467, imageHeight * 0.5747663551401869, imageWidth * 0.4766355140186916, imageHeight * 0.14018691588785046);
                        grad.addColorStop(1, pointerColor.veryLight.getRgbaColor());
                        grad.addColorStop(0, pointerColor.light.getRgbaColor());
                        ctx.fillStyle = grad;
                        ctx.strokeStyle = pointerColor.light.getRgbaColor();
                    }
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        };

        var drawSecondPointer = function(ctx, ptrType, shadow) {
            ctx.save();
            var grad;

            if (shadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 3;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            } else {
                ctx.fillStyle = steelseries.ColorDef.RED.medium.getRgbaColor();
                ctx.strokeStyle = steelseries.ColorDef.RED.medium.getRgbaColor();
            }

            switch (ptrType.type) {
                case 'type2':
                    // top rectangle
                    ctx.lineWidth = imageWidth * 0.009345794;
                    ctx.beginPath();
                    ctx.moveTo(centerX, imageWidth * 0.0981308411);
                    ctx.lineTo(centerX, imageWidth * 0.0981308411 + imageWidth * 0.1261682243);
                    ctx.closePath();
                    ctx.stroke();
                    // bottom rectangle
                    ctx.lineWidth = imageWidth * 0.0186915888;
                    ctx.beginPath();
                    ctx.moveTo(centerX, imageWidth * 0.308411215);
                    ctx.lineTo(centerX, imageWidth * 0.308411215 + imageWidth * 0.191588785);
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
                    ctx.moveTo(imageWidth * 0.5093457943925234, imageHeight * 0.11682242990654206);
                    ctx.lineTo(imageWidth * 0.5093457943925234, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.49065420560747663, imageHeight * 0.5747663551401869);
                    ctx.lineTo(imageWidth * 0.49065420560747663, imageHeight * 0.11682242990654206);
                    ctx.lineTo(imageWidth * 0.5093457943925234, imageHeight * 0.11682242990654206);
                    ctx.closePath();
                    if (!shadow) {
                      grad = ctx.createLinearGradient(imageWidth * 0.5093457943925234, imageHeight * 0.11682242990654206, imageWidth * 0.49065420560747663, imageHeight * 0.5747663551401869);
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
            ctx.restore();
        };

        var drawKnob = function(ctx) {
            var shadowOffset = imageWidth * 0.006;
            var grad;

            // draw the shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 1)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(centerX + shadowOffset, centerY + shadowOffset, imageWidth * 0.045, 0 , TWO_PI);
            ctx.closePath();
            ctx.fill();
            // draw the knob
            ctx.beginPath();
            ctx.arc(centerX, centerY, imageWidth * 0.045, 0 , TWO_PI);
            ctx.closePath();
            ctx.shadowColor = '';
            ctx.shadowBlur = 0;
            grad = ctx.createLinearGradient(centerX - imageWidth * 0.045/2, centerY - imageWidth * 0.045/2, centerX + imageWidth * 0.045/2, centerY + imageWidth * 0.045/2);
            grad.addColorStop(0, 'rgba(238, 240, 242, 1)');
            grad.addColorStop(1, 'rgba(101, 105, 109, 1)');
            ctx.fillStyle = grad;
            ctx.fill();
        };

        var drawTopKnob = function(ctx, ptrType) {
            var shadowOffset = imageWidth * 0.006;
            var grad;

            ctx.save();

            switch (ptrType.type) {
                case 'type2':
                    // draw shadow
                    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                    ctx.shadowBlur = 3;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.arc(centerX + shadowOffset, centerY + shadowOffset, imageWidth * 0.0887850467 / 2, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.fill();
                    // draw knob
                    ctx.shadowColor = '';
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, imageWidth * 0.0887850467 / 2, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'type1':
                default:
                    // draw shadow
                    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                    ctx.shadowBlur = 3;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.beginPath();
                    ctx.arc(centerX + shadowOffset, centerY + shadowOffset, imageWidth * 0.027, 0 , TWO_PI);
                    ctx.closePath();
                    ctx.fill();
                    // draw knob
                    ctx.shadowColor = '';
                    ctx.shadowBlur = 0;
                    grad = ctx.createLinearGradient(centerX - imageWidth * 0.027 /2, centerY - imageWidth * 0.027 /2, centerX + imageWidth * 0.027 /2, centerY + imageWidth * 0.027 /2);
                    grad.addColorStop(0, 'rgba(234, 235, 238, 1)');
                    grad.addColorStop(0.11, 'rgba(234, 236, 238, 1)');
                    grad.addColorStop(0.12, 'rgba(232, 234, 236, 1)');
                    grad.addColorStop(0.2, 'rgba(192, 197, 203, 1)');
                    grad.addColorStop(0.2001, 'rgba(190, 195, 201, 1)');
                    grad.addColorStop(1, 'rgba(190, 195, 201, 1)');
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
            hour = objDate.getHours() + timeZoneOffsetHour;
            if (hour > 12) {
                hour -= 12;
            }
            if (hour < 0) {
                hour += 12;
            }

            // Minutes
            minute = objDate.getMinutes() + timeZoneOffsetMinute;
            if (minute > 60) {
                minute -= 60;
                hour++;
            }
            if (minute < 0) {
                minute += 60;
                hour--;
            }

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

            if (drawBackground) {
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

            if (drawForeground) {
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
            } else if (!isAutomatic && newValue){
                // start the clock
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

        this.setPointerType = function(newPointerType) {
            resetBuffers({
                background: true,
                pointers: true,
                foreground: true
                });
            pointerType = newPointerType;
            if (pointerType.type === 'type1') {
                pointerColor = steelseries.ColorDef.GRAY;
                backgroundColor = steelseries.BackgroundColor.ANTHRACITE;
            } else {
                pointerColor = steelseries.ColorDef.BLACK;
                backgroundColor = steelseries.BackgroundColor.LIGHT_GRAY;
            }
            init({
                frame: true,
                background: true,
                pointers: true,
                foreground: true
                });
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
            mainCtx.drawImage(frameBuffer, 0, 0);

            // Draw buffered image to visible canvas
            mainCtx.drawImage(backgroundBuffer, 0, 0);

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
            mainCtx.drawImage(foregroundBuffer, 0, 0);
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
            ctx.moveTo(imageWidth * 0.025, imageHeight * 0.05555555555555555);
            ctx.lineTo(imageWidth * 0.9, imageHeight * 0.05555555555555555);
            ctx.lineTo(imageWidth * 0.9, imageHeight * 0.9444444444444444);
            ctx.lineTo(imageWidth * 0.025, imageHeight * 0.9444444444444444);
            ctx.lineTo(imageWidth * 0.025, imageHeight * 0.05555555555555555);
            ctx.closePath();
            //
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.925, imageHeight * 0.0);
            ctx.lineTo(imageWidth * 0.0, imageHeight * 0.0);
            ctx.lineTo(imageWidth * 0.0, imageHeight * 1.0);
            ctx.lineTo(imageWidth * 0.925, imageHeight * 1.0);
            ctx.lineTo(imageWidth * 0.925, imageHeight * 0.7222222222222222);
            ctx.bezierCurveTo(imageWidth * 0.925, imageHeight * 0.7222222222222222, imageWidth * 0.975, imageHeight * 0.7222222222222222, imageWidth * 0.975, imageHeight * 0.7222222222222222);
            ctx.bezierCurveTo(imageWidth * 1.0, imageHeight * 0.7222222222222222, imageWidth * 1.0, imageHeight * 0.6666666666666666, imageWidth * 1.0, imageHeight * 0.6666666666666666);
            ctx.bezierCurveTo(imageWidth * 1.0, imageHeight * 0.6666666666666666, imageWidth * 1.0, imageHeight * 0.3333333333333333, imageWidth * 1.0, imageHeight * 0.3333333333333333);
            ctx.bezierCurveTo(imageWidth * 1.0, imageHeight * 0.3333333333333333, imageWidth * 1.0, imageHeight * 0.2777777777777778, imageWidth * 0.975, imageHeight * 0.2777777777777778);
            ctx.bezierCurveTo(imageWidth * 0.975, imageHeight * 0.2777777777777778, imageWidth * 0.925, imageHeight * 0.2777777777777778, imageWidth * 0.925, imageHeight * 0.2777777777777778);
            ctx.lineTo(imageWidth * 0.925, imageHeight * 0.0);
            ctx.closePath();
            //
            grad = ctx.createLinearGradient(0, 0, 0, imageHeight);
            grad.addColorStop(0.0, 'rgb(255, 255, 255)');
            grad.addColorStop(1.0, 'rgb(126, 126, 126)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Main
            ctx.beginPath();
            var end = Math.max(imageWidth * 0.875 * (value / 100.0), Math.ceil(imageWidth * 0.01));
            ctx.rect(imageWidth * 0.025, imageWidth * 0.025, end, imageHeight * 0.88888888888888);
            ctx.closePath();
            var BORDER_FRACTIONS = [0, 0.4, 1];
            var BORDER_COLORS = [
                                new rgbaColor(177, 5, 2, 1),   // 0xB11902
                                new rgbaColor(119, 107, 23, 1), // 0xDBA715
                                new rgbaColor(81, 242, 35, 1)  // 0x79A24B
                                ];
            var border = new gradientWrapper(0, 0, 100, 0, BORDER_FRACTIONS, BORDER_COLORS);
            ctx.fillStyle = border.getColorAt(value / 100).getRgbColor();
            ctx.fill();
            ctx.beginPath();
            end = Math.max(end - imageWidth * 0.05, 0)
            ctx.rect(imageWidth * 0.05, imageWidth * 0.05, end, imageHeight * 0.77777777777777);
            ctx.closePath();
            var LIQUID_COLORS_DARK = [
                                new rgbaColor(198, 9, 5, 1),   // 0xC62705
                                new rgbaColor(108, 109, 12, 1), // 0xE4BD20
                                new rgbaColor(23, 216, 12, 1) // 0xA3D866
                                ];

            var LIQUID_COLORS_LIGHT = [
                                new rgbaColor(250, 61, 48, 1),   // 0xF67930
                                new rgbaColor(234, 234, 17, 1),  // 0xF6F49D
                                new rgbaColor(33, 254, 26, 1)     // 0xDFE956
                                ];
            var LIQUID_GRADIENT_FRACTIONS = [0, 0.4, 1];
            var liquidDark = new gradientWrapper(0, 0, 100, 0, LIQUID_GRADIENT_FRACTIONS, LIQUID_COLORS_DARK);
            var liquidLight = new gradientWrapper(0, 0, 100, 0, LIQUID_GRADIENT_FRACTIONS, LIQUID_COLORS_LIGHT);
            grad = ctx.createLinearGradient(imageWidth * 0.05, 0, imageWidth * 0.875, 0);
            grad.addColorStop(0, liquidDark.getColorAt(value / 100).getRgbColor());
            grad.addColorStop(0.5, liquidLight.getColorAt(value / 100).getRgbColor());
            grad.addColorStop(1, liquidDark.getColorAt(value / 100).getRgbColor());
            ctx.fillStyle = grad;
            ctx.fill();

            // Foreground
            ctx.beginPath();
            ctx.rect(imageWidth * 0.025, imageWidth * 0.025, imageWidth * 0.875, imageHeight * 0.44444444444444);
            ctx.closePath();
            grad = ctx.createLinearGradient(imageWidth * 0.025, imageWidth * 0.025, imageWidth * 0.875, imageHeight * 0.44444444444444);
            grad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.8)');
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
    var radWithKnob;
    var radKnob;
    var radGaugeType;
    var radOrientation;
    var linFgBuffer = createBuffer(1,1);
    var linVertical;

    //************************************  I M A G E   -   F U N C T I O N S  *****************************************

    var drawRoseImage = function(ctx, centerX, centerY, imageWidth, imageHeight, backgroundColor) {
        var alternate = 0;
        var i;
        ctx.save();
        ctx.lineWidth = 1.0;
        ctx.fillStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.translate(centerX, centerY);
        // broken ring
        for (i = 0; 360 > i; i += 15) {
            alternate++;

            ctx.beginPath();
            ctx.rotate(i * Math.PI / 180);
            ctx.moveTo(imageWidth * 0.23, 0);
            ctx.lineTo(imageWidth * 0.26, 0);
            ctx.rotate(-i * Math.PI / 180);
            ctx.arc(0, 0, imageWidth * 0.26, i * Math.PI / 180, (i + 15) * Math.PI / 180, false);
            ctx.arc(0, 0, imageWidth * 0.23, (i + 15) * Math.PI / 180, i * Math.PI / 180, true);
            ctx.closePath();
            if (0 === alternate % 2) {
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
        ctx.moveTo(imageWidth * 0.5607476635514018, imageHeight * 0.5841121495327103);
        ctx.lineTo(imageWidth * 0.6401869158878505, imageHeight * 0.6448598130841121);
        ctx.lineTo(imageWidth * 0.5841121495327103, imageHeight * 0.5607476635514018);
        ctx.lineTo(imageWidth * 0.5607476635514018, imageHeight * 0.5841121495327103);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH2_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.411214953271028, imageHeight * 0.5607476635514018);
        ctx.lineTo(imageWidth * 0.35514018691588783, imageHeight * 0.6448598130841121);
        ctx.lineTo(imageWidth * 0.4392523364485981, imageHeight * 0.5887850467289719);
        ctx.lineTo(imageWidth * 0.411214953271028, imageHeight * 0.5607476635514018);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH3_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.5841121495327103, imageHeight * 0.4439252336448598);
        ctx.lineTo(imageWidth * 0.6401869158878505, imageHeight * 0.3598130841121495);
        ctx.lineTo(imageWidth * 0.5607476635514018, imageHeight * 0.4205607476635514);
        ctx.lineTo(imageWidth * 0.5841121495327103, imageHeight * 0.4439252336448598);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH4_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.4392523364485981, imageHeight * 0.4158878504672897);
        ctx.lineTo(imageWidth * 0.35514018691588783, imageHeight * 0.3598130841121495);
        ctx.lineTo(imageWidth * 0.4158878504672897, imageHeight * 0.4392523364485981);
        ctx.lineTo(imageWidth * 0.4392523364485981, imageHeight * 0.4158878504672897);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.fill();
        ctx.stroke();

        // PATH5_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.5233644859813084, imageHeight * 0.397196261682243);
        ctx.lineTo(imageWidth * 0.5, imageHeight * 0.19626168224299065);
        ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.397196261682243);
        ctx.lineTo(imageWidth * 0.5233644859813084, imageHeight * 0.397196261682243);
        ctx.closePath();
        var PATH5_2_GRADIENT = ctx.createLinearGradient((0.4766355140186916 * imageWidth), (0.3925233644859813 * imageHeight), ((0.4766355140186916 + 0.04205607476635514) * imageWidth), ((0.3925233644859813) * imageHeight));
        PATH5_2_GRADIENT.addColorStop(0.0, 'rgba(222, 223, 218, 1.0)');
        PATH5_2_GRADIENT.addColorStop(0.48, 'rgba(222, 223, 218, 1.0)');
        PATH5_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
        PATH5_2_GRADIENT.addColorStop(1.0, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH5_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH6_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.4719626168224299, imageHeight * 0.6074766355140186);
        ctx.lineTo(imageWidth * 0.5, imageHeight * 0.8130841121495327);
        ctx.lineTo(imageWidth * 0.5233644859813084, imageHeight * 0.6074766355140186);
        ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.6074766355140186);
        ctx.closePath();
        var PATH6_2_GRADIENT = ctx.createLinearGradient((0.5186915887850467 * imageWidth), (0.6121495327102804 * imageHeight), ((0.5186915887850467 + -0.037383177570093455) * imageWidth), ((0.6121495327102804 + 4.5781188753172085E-18) * imageHeight));
        PATH6_2_GRADIENT.addColorStop(0.0, 'rgba(222, 223, 218, 1.0)');
        PATH6_2_GRADIENT.addColorStop(0.56, 'rgba(222, 223, 218, 1.0)');
        PATH6_2_GRADIENT.addColorStop(0.5601, backgroundColor.symbolColor.getRgbaColor());
        PATH6_2_GRADIENT.addColorStop(1.0, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH6_2_GRADIENT;
        ctx.lineWidth = 1.0;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = backgroundColor.symbolColor.getRgbaColor();
        ctx.fill();
        ctx.stroke();

        // PATH7_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.602803738317757, imageHeight * 0.5280373831775701);
        ctx.lineTo(imageWidth * 0.8037383177570093, imageHeight * 0.5);
        ctx.lineTo(imageWidth * 0.602803738317757, imageHeight * 0.4766355140186916);
        ctx.lineTo(imageWidth * 0.602803738317757, imageHeight * 0.5280373831775701);
        ctx.closePath();
        var PATH7_2_GRADIENT = ctx.createLinearGradient((0.6074766355140186 * imageWidth), (0.48598130841121495 * imageHeight), ((0.6074766355140186 + 1.716794578243953E-18) * imageWidth), ((0.48598130841121495 + 0.028037383177570093) * imageHeight));
        PATH7_2_GRADIENT.addColorStop(0.0, 'rgba(222, 223, 218, 1.0)');
        PATH7_2_GRADIENT.addColorStop(0.48, 'rgba(222, 223, 218, 1.0)');
        PATH7_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
        PATH7_2_GRADIENT.addColorStop(1.0, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH7_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH8_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.3925233644859813, imageHeight * 0.4766355140186916);
        ctx.lineTo(imageWidth * 0.19158878504672897, imageHeight * 0.5);
        ctx.lineTo(imageWidth * 0.3925233644859813, imageHeight * 0.5280373831775701);
        ctx.lineTo(imageWidth * 0.3925233644859813, imageHeight * 0.4766355140186916);
        ctx.closePath();
        var PATH8_2_GRADIENT = ctx.createLinearGradient((0.3925233644859813 * imageWidth), (0.5280373831775701 * imageHeight), ((0.3925233644859813 + 2.57519186736593E-18) * imageWidth), ((0.5280373831775701 + -0.04205607476635514) * imageHeight));
        PATH8_2_GRADIENT.addColorStop(0.0, 'rgba(222, 223, 218, 1.0)');
        PATH8_2_GRADIENT.addColorStop(0.52, 'rgba(222, 223, 218, 1.0)');
        PATH8_2_GRADIENT.addColorStop(0.53, backgroundColor.symbolColor.getRgbaColor());
        PATH8_2_GRADIENT.addColorStop(1.0, backgroundColor.symbolColor.getRgbaColor());
        ctx.fillStyle = PATH8_2_GRADIENT;
        ctx.fill();
        ctx.stroke();

        // PATH9_2
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.40654205607476634, imageHeight * 0.5046728971962616);
        ctx.bezierCurveTo(imageWidth * 0.40654205607476634, imageHeight * 0.4532710280373832, imageWidth * 0.4485981308411215, imageHeight * 0.411214953271028, imageWidth * 0.5, imageHeight * 0.411214953271028);
        ctx.bezierCurveTo(imageWidth * 0.5467289719626168, imageHeight * 0.411214953271028, imageWidth * 0.5887850467289719, imageHeight * 0.4532710280373832, imageWidth * 0.5887850467289719, imageHeight * 0.5046728971962616);
        ctx.bezierCurveTo(imageWidth * 0.5887850467289719, imageHeight * 0.5514018691588785, imageWidth * 0.5467289719626168, imageHeight * 0.5934579439252337, imageWidth * 0.5, imageHeight * 0.5934579439252337);
        ctx.bezierCurveTo(imageWidth * 0.4485981308411215, imageHeight * 0.5934579439252337, imageWidth * 0.40654205607476634, imageHeight * 0.5514018691588785, imageWidth * 0.40654205607476634, imageHeight * 0.5046728971962616);
        ctx.closePath();
        ctx.moveTo(imageWidth * 0.3878504672897196, imageHeight * 0.5046728971962616);
        ctx.bezierCurveTo(imageWidth * 0.3878504672897196, imageHeight * 0.5607476635514018, imageWidth * 0.4392523364485981, imageHeight * 0.6121495327102804, imageWidth * 0.5, imageHeight * 0.6121495327102804);
        ctx.bezierCurveTo(imageWidth * 0.5560747663551402, imageHeight * 0.6121495327102804, imageWidth * 0.6074766355140186, imageHeight * 0.5607476635514018, imageWidth * 0.6074766355140186, imageHeight * 0.5046728971962616);
        ctx.bezierCurveTo(imageWidth * 0.6074766355140186, imageHeight * 0.4439252336448598, imageWidth * 0.5560747663551402, imageHeight * 0.3925233644859813, imageWidth * 0.5, imageHeight * 0.3925233644859813);
        ctx.bezierCurveTo(imageWidth * 0.4392523364485981, imageHeight * 0.3925233644859813, imageWidth * 0.3878504672897196, imageHeight * 0.4439252336448598, imageWidth * 0.3878504672897196, imageHeight * 0.5046728971962616);
        ctx.closePath();
        ctx.fillStyle = fillColorPath;
        ctx.lineWidth = 1.0;
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
            ctx.moveTo(imageWidth * 0.5607476635514018, imageHeight * 0.5841121495327103);
            ctx.lineTo(imageWidth * 0.6401869158878505, imageHeight * 0.6448598130841121);
            ctx.lineTo(imageWidth * 0.5841121495327103, imageHeight * 0.5607476635514018);
            ctx.lineTo(imageWidth * 0.5607476635514018, imageHeight * 0.5841121495327103);
            ctx.closePath();
            ctx.fillStyle = fillColorPath;
            ctx.fill();
            ctx.stroke();
            // Large pointers
            ctx.beginPath();
            ctx.moveTo(imageWidth * 0.5233644859813084, imageHeight * 0.397196261682243);
            ctx.lineTo(imageWidth * 0.5, imageHeight * 0.19626168224299065);
            ctx.lineTo(imageWidth * 0.4719626168224299, imageHeight * 0.397196261682243);
            ctx.lineTo(imageWidth * 0.5233644859813084, imageHeight * 0.397196261682243);
            ctx.closePath();
            var PATH5_2_GRADIENT = ctx.createLinearGradient((0.4766355140186916 * imageWidth), (0.3925233644859813 * imageHeight), ((0.4766355140186916 + 0.04205607476635514) * imageWidth), ((0.3925233644859813) * imageHeight));
            PATH5_2_GRADIENT.addColorStop(0.0, 'rgba(222, 223, 218, 1.0)');
            PATH5_2_GRADIENT.addColorStop(0.48, 'rgba(222, 223, 218, 1.0)');
            PATH5_2_GRADIENT.addColorStop(0.49, backgroundColor.symbolColor.getRgbaColor());
            PATH5_2_GRADIENT.addColorStop(1.0, backgroundColor.symbolColor.getRgbaColor());
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
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 3;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        }

        switch (ptrType.type) {
            case 'type2':
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, size * 0.4719626168224299, 0, size * 0.1308411214953271);
                    grad.addColorStop(0.0, lblColor.getRgbaColor());
                    grad.addColorStop(0.36, lblColor.getRgbaColor());
                    grad.addColorStop(0.361, ptrColor.light.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.light.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5186915887850467, size * 0.4719626168224299);
                ctx.lineTo(size * 0.5093457943925234, size * 0.46261682242990654);
                ctx.lineTo(size * 0.5093457943925234, size * 0.3411214953271028);
                ctx.lineTo(size * 0.5046728971962616, size * 0.1308411214953271);
                ctx.lineTo(size * 0.4953271028037383, size * 0.1308411214953271);
                ctx.lineTo(size * 0.49065420560747663, size * 0.3411214953271028);
                ctx.lineTo(size * 0.49065420560747663, size * 0.46261682242990654);
                ctx.lineTo(size * 0.48130841121495327, size * 0.4719626168224299);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type3':
                ctx.beginPath();
                ctx.rect(size * 0.4953271028037383, size * 0.1308411214953271, size * 0.009345794392523364, size * 0.37383177570093457);
                ctx.closePath();
                if (!shadow) {
                    ctx.fillStyle = ptrColor.light.getRgbaColor();
                }
                ctx.fill();
                break;

            case 'type4':
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.4672897196261682 * size), (0.48130841121495327 * size), ((0.4672897196261682 + 0.06074766355140187) * size), (0.48130841121495327 * size));
                    grad.addColorStop(0.0, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(0.51, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(0.52, ptrColor.light.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.light.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.1261682242990654);
                ctx.lineTo(size * 0.514018691588785, size * 0.13551401869158877);
                ctx.lineTo(size * 0.5327102803738317, size * 0.5);
                ctx.lineTo(size * 0.5233644859813084, size * 0.602803738317757);
                ctx.lineTo(size * 0.4766355140186916, size * 0.602803738317757);
                ctx.lineTo(size * 0.4672897196261682, size * 0.5);
                ctx.lineTo(size * 0.49065420560747663, size * 0.13551401869158877);
                ctx.lineTo(size * 0.5, size * 0.1261682242990654);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type5':
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.4719626168224299 * size), (0.49065420560747663 * size), ((0.4719626168224299 + 0.056074766355140186) * size), (0.49065420560747663 * size));
                    grad.addColorStop(0.0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.46, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.47, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.4953271028037383);
                ctx.lineTo(size * 0.5280373831775701, size * 0.4953271028037383);
                ctx.lineTo(size * 0.5, size * 0.14953271028037382);
                ctx.lineTo(size * 0.4719626168224299, size * 0.4953271028037383);
                ctx.lineTo(size * 0.5, size * 0.4953271028037383);
                ctx.closePath();
                ctx.fill();

                ctx.lineWidth = 1.0;
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
                ctx.moveTo(size * 0.48130841121495327, size * 0.48598130841121495);
                ctx.lineTo(size * 0.48130841121495327, size * 0.3925233644859813);
                ctx.lineTo(size * 0.48598130841121495, size * 0.3177570093457944);
                ctx.lineTo(size * 0.4953271028037383, size * 0.1308411214953271);
                ctx.lineTo(size * 0.5046728971962616, size * 0.1308411214953271);
                ctx.lineTo(size * 0.514018691588785, size * 0.3177570093457944);
                ctx.lineTo(size * 0.5186915887850467, size * 0.3878504672897196);
                ctx.lineTo(size * 0.5186915887850467, size * 0.48598130841121495);
                ctx.lineTo(size * 0.5046728971962616, size * 0.48598130841121495);
                ctx.lineTo(size * 0.5046728971962616, size * 0.3878504672897196);
                ctx.lineTo(size * 0.5, size * 0.3177570093457944);
                ctx.lineTo(size * 0.4953271028037383, size * 0.3925233644859813);
                ctx.lineTo(size * 0.4953271028037383, size * 0.48598130841121495);
                ctx.lineTo(size * 0.48130841121495327, size * 0.48598130841121495);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type7':
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.48130841121495327 * size), (0.49065420560747663 * size), ((0.48130841121495327 + 0.037383177570093455) * size), (0.49065420560747663 * size));
                    grad.addColorStop(0.0, ptrColor.dark.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.49065420560747663, size * 0.1308411214953271);
                ctx.lineTo(size * 0.48130841121495327, size * 0.5);
                ctx.lineTo(size * 0.5186915887850467, size * 0.5);
                ctx.lineTo(size * 0.5046728971962616, size * 0.1308411214953271);
                ctx.lineTo(size * 0.49065420560747663, size * 0.1308411214953271);
                ctx.closePath();
                ctx.fill();
                break;

            case 'type8':
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.4719626168224299 * size), (0.49065420560747663 * size), ((0.4719626168224299 + 0.056074766355140186) * size), (0.49065420560747663 * size));
                    grad.addColorStop(0.0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.46, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.47, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.5327102803738317);
                ctx.lineTo(size * 0.5327102803738317, size * 0.5);
                ctx.bezierCurveTo(size * 0.5327102803738317, size * 0.5, size * 0.5093457943925234, size * 0.45794392523364486, size * 0.5, size * 0.14953271028037382);
                ctx.bezierCurveTo(size * 0.49065420560747663, size * 0.45794392523364486, size * 0.4672897196261682, size * 0.5, size * 0.4672897196261682, size * 0.5);
                ctx.lineTo(size * 0.5, size * 0.5327102803738317);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'type9':
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.4719626168224299 * size), (0.5280373831775701 * size), ((0.4719626168224299 + 0.056074766355140186) * size), (0.5280373831775701 * size));
                    grad.addColorStop(0.0, 'rgba(50, 50, 50, 1.0)');
                    grad.addColorStop(0.48, 'rgba(102, 102, 102, 1.0)');
                    grad.addColorStop(1.0, 'rgba(50, 50, 50, 1.0)');
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = '#2E2E2E';
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.4953271028037383, size * 0.2336448598130841);
                ctx.lineTo(size * 0.5046728971962616, size * 0.2336448598130841);
                ctx.lineTo(size * 0.514018691588785, size * 0.4392523364485981);
                ctx.lineTo(size * 0.48598130841121495, size * 0.4392523364485981);
                ctx.lineTo(size * 0.4953271028037383, size * 0.2336448598130841);
                ctx.closePath();
                ctx.moveTo(size * 0.49065420560747663, size * 0.1308411214953271);
                ctx.lineTo(size * 0.4719626168224299, size * 0.4719626168224299);
                ctx.lineTo(size * 0.4719626168224299, size * 0.5280373831775701);
                ctx.bezierCurveTo(size * 0.4719626168224299, size * 0.5280373831775701, size * 0.4766355140186916, size * 0.602803738317757, size * 0.4766355140186916, size * 0.602803738317757);
                ctx.bezierCurveTo(size * 0.4766355140186916, size * 0.6074766355140186, size * 0.48130841121495327, size * 0.6074766355140186, size * 0.5, size * 0.6074766355140186);
                ctx.bezierCurveTo(size * 0.5186915887850467, size * 0.6074766355140186, size * 0.5233644859813084, size * 0.6074766355140186, size * 0.5233644859813084, size * 0.602803738317757);
                ctx.bezierCurveTo(size * 0.5233644859813084, size * 0.602803738317757, size * 0.5280373831775701, size * 0.5280373831775701, size * 0.5280373831775701, size * 0.5280373831775701);
                ctx.lineTo(size * 0.5280373831775701, size * 0.4719626168224299);
                ctx.lineTo(size * 0.5093457943925234, size * 0.1308411214953271);
                ctx.lineTo(size * 0.49065420560747663, size * 0.1308411214953271);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(size * 0.4953271028037383, size * 0.21962616822429906);
                ctx.lineTo(size * 0.5046728971962616, size * 0.21962616822429906);
                ctx.lineTo(size * 0.5046728971962616, size * 0.13551401869158877);
                ctx.lineTo(size * 0.4953271028037383, size * 0.13551401869158877);
                ctx.lineTo(size * 0.4953271028037383, size * 0.21962616822429906);
                ctx.closePath();

                if (!shadow) {
                    ctx.fillStyle = ptrColor.medium.getRgbaColor();
                }
                ctx.fill();
                break;

            case 'type10':
                // POINTER_TYPE10
                ctx.beginPath();
                ctx.moveTo(size * 0.5, size * 0.14953271028037382);
                ctx.bezierCurveTo(size * 0.5, size * 0.14953271028037382, size * 0.4439252336448598, size * 0.49065420560747663, size * 0.4439252336448598, size * 0.5);
                ctx.bezierCurveTo(size * 0.4439252336448598, size * 0.5327102803738317, size * 0.4672897196261682, size * 0.5560747663551402, size * 0.5, size * 0.5560747663551402);
                ctx.bezierCurveTo(size * 0.5327102803738317, size * 0.5560747663551402, size * 0.5560747663551402, size * 0.5327102803738317, size * 0.5560747663551402, size * 0.5);
                ctx.bezierCurveTo(size * 0.5560747663551402, size * 0.49065420560747663, size * 0.5, size * 0.14953271028037382, size * 0.5, size * 0.14953271028037382);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient((0.4719626168224299 * size), (0.49065420560747663 * size), ((0.4719626168224299 + 0.056074766355140186) * size), (0.49065420560747663 * size));
                    grad.addColorStop(0.0, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.4999, ptrColor.light.getRgbaColor());
                    grad.addColorStop(0.5, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.lineWidth = 1.0;
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                if (!shadow) {
                    ctx.strokeStyle = ptrColor.medium.getRgbaColor();
                }
                ctx.fill();
                ctx.stroke();
                break;

            case 'type11':
                // POINTER_TYPE11
                ctx.beginPath();
                ctx.moveTo(0.5 * size, 0.16822429906542055 * size);
                ctx.lineTo(0.48598130841121495 * size, 0.5 * size);
                ctx.bezierCurveTo(0.48598130841121495 * size, 0.5 * size, 0.48130841121495327 * size, 0.5841121495327103 * size, 0.5 * size, 0.5841121495327103 * size);
                ctx.bezierCurveTo(0.514018691588785 * size, 0.5841121495327103 * size, 0.5093457943925234 * size, 0.5 * size, 0.5093457943925234 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.16822429906542055 * size);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, 0.16822429906542055 * size, 0, 0.514018691588785 * size);
                    grad.addColorStop(0.0, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.dark.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.fill();
                ctx.stroke();
                break;

            case 'type12':
                // POINTER_TYPE12
                ctx.beginPath();
                ctx.moveTo(0.5 * size, 0.16822429906542055 * size);
                ctx.lineTo(0.48598130841121495 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.5046728971962616 * size);
                ctx.lineTo(0.5093457943925234 * size, 0.5 * size);
                ctx.lineTo(0.5 * size, 0.16822429906542055 * size);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.5 * size, 0.16822429906542055 * size, 0.5 * size, 0.5046728971962616 * size);
                    grad.addColorStop(0.0, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.dark.getRgbaColor());
                    ctx.fillStyle = grad;
                    ctx.strokeStyle = ptrColor.dark.getRgbaColor();
                }
                ctx.fill();
                ctx.stroke();
                break;

            case 'type13':
                // POINTER_TYPE13
                ctx.beginPath();
                ctx.moveTo(0.48598130841121495 * size, 0.16822429906542055 * size);
                ctx.lineTo(0.5 * size, 0.1308411214953271 * size);
                ctx.lineTo(0.5093457943925234 * size, 0.16822429906542055 * size);
                ctx.lineTo(0.5093457943925234 * size, 0.5093457943925234 * size);
                ctx.lineTo(0.48598130841121495 * size, 0.5093457943925234 * size);
                ctx.lineTo(0.48598130841121495 * size, 0.16822429906542055 * size);
                ctx.closePath();
                if (!shadow) {
                    grad = ctx.createLinearGradient(0.5 * size, 0.5 * size, 0.5 * size, 0.1308411214953271 * size);
                    grad.addColorStop(0.0, lblColor.getRgbaColor());
                    grad.addColorStop(0.849999, lblColor.getRgbaColor());
                    grad.addColorStop(0.85, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.medium.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.fill();
                break;

            case 'type1':
            default:
                if (!shadow) {
                    grad = ctx.createLinearGradient(0, size * 0.4719626168224299, 0, size * 0.1308411214953271);
                    grad.addColorStop(0.0, ptrColor.veryDark.getRgbaColor());
                    grad.addColorStop(0.3, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(0.59, ptrColor.medium.getRgbaColor());
                    grad.addColorStop(1.0, ptrColor.veryDark.getRgbaColor());
                    ctx.fillStyle = grad;
                }
                ctx.beginPath();
                ctx.moveTo(size * 0.5186915887850467, size * 0.4719626168224299);
                ctx.bezierCurveTo(size * 0.514018691588785, size * 0.45794392523364486, size * 0.5093457943925234, size * 0.4158878504672897, size * 0.5093457943925234, size * 0.40186915887850466);
                ctx.bezierCurveTo(size * 0.5046728971962616, size * 0.38317757009345793, size * 0.5, size * 0.1308411214953271, size * 0.5, size * 0.1308411214953271);
                ctx.bezierCurveTo(size * 0.5, size * 0.1308411214953271, size * 0.49065420560747663, size * 0.38317757009345793, size * 0.49065420560747663, size * 0.397196261682243);
                ctx.bezierCurveTo(size * 0.49065420560747663, size * 0.4158878504672897, size * 0.48598130841121495, size * 0.45794392523364486, size * 0.48130841121495327, size * 0.4719626168224299);
                ctx.bezierCurveTo(size * 0.4719626168224299, size * 0.48130841121495327, size * 0.4672897196261682, size * 0.49065420560747663, size * 0.4672897196261682, size * 0.5);
                ctx.bezierCurveTo(size * 0.4672897196261682, size * 0.5186915887850467, size * 0.48130841121495327, size * 0.5327102803738317, size * 0.5, size * 0.5327102803738317);
                ctx.bezierCurveTo(size * 0.5186915887850467, size * 0.5327102803738317, size * 0.5327102803738317, size * 0.5186915887850467, size * 0.5327102803738317, size * 0.5);
                ctx.bezierCurveTo(size * 0.5327102803738317, size * 0.49065420560747663, size * 0.5280373831775701, size * 0.48130841121495327, size * 0.5186915887850467, size * 0.4719626168224299);
                ctx.closePath();
                ctx.fill();
                break;
        }
        ctx.restore();
    };

    var drawRadialFrameImage = function(ctx, frameDesign, centerX, centerY, imageWidth, imageHeight) {
        ctx.save();

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
        radFCtx.arc(centerX, centerY, imageWidth / 2.0, 0, Math.PI * 2, true);
        radFCtx.closePath();
        radFCtx.fill();
        radFCtx.stroke();

        var grad;
        var outerX;
        var innerX;
        var fractions;
        var colors;

        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth * 0.9906542301177979 / 2.0, 0, Math.PI * 2, true);
        radFCtx.closePath();

        // main gradient frame
        switch (frameDesign.design) {
            case "metal":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(254, 254, 254)');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.12, 'rgb(179, 179, 179)');
                grad.addColorStop(1.0, 'rgb(213, 213, 213)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "brass":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(249, 243, 155)');
                grad.addColorStop(0.05, 'rgb(246, 226, 101)');
                grad.addColorStop(0.10, 'rgb(240, 225, 132)');
                grad.addColorStop(0.50, 'rgb(90, 57, 22)');
                grad.addColorStop(0.90, 'rgb(249, 237, 139)');
                grad.addColorStop(0.95, 'rgb(243, 226, 108)');
                grad.addColorStop(1.0, 'rgb(202, 182, 113)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "steel":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(231, 237, 237)');
                grad.addColorStop(0.05, 'rgb(189, 199, 198)');
                grad.addColorStop(0.10, 'rgb(192, 201, 200)');
                grad.addColorStop(0.50, 'rgb(23, 31, 33)');
                grad.addColorStop(0.90, 'rgb(196, 205, 204)');
                grad.addColorStop(0.95, 'rgb(194, 204, 203)');
                grad.addColorStop(1.0, 'rgb(189, 201, 199)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "gold":
                grad = radFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(255, 255, 207)');
                grad.addColorStop(0.15, 'rgb(255, 237, 96)');
                grad.addColorStop(0.22, 'rgb(254, 199, 57)');
                grad.addColorStop(0.3, 'rgb(255, 249, 203)');
                grad.addColorStop(0.38, 'rgb(255, 199, 64)');
                grad.addColorStop(0.44, 'rgb(252, 194, 60)');
                grad.addColorStop(0.51, 'rgb(255, 204, 59)');
                grad.addColorStop(0.6, 'rgb(213, 134, 29)');
                grad.addColorStop(0.68, 'rgb(255, 201, 56)');
                grad.addColorStop(0.75, 'rgb(212, 135, 29)');
                grad.addColorStop(1.0, 'rgb(247, 238, 101)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "anthracite":
                grad = radFCtx.createLinearGradient((0.5 * imageWidth), (0.004672897196261682 * imageHeight), ((0.5 + 6.066007509795301E-17) * imageWidth), ((0.004672897196261682 + 0.9906542056074766) * imageHeight));
                grad.addColorStop(0.0, 'rgba(118, 117, 135, 1.0)');
                grad.addColorStop(0.06, 'rgba(74, 74, 82, 1.0)');
                grad.addColorStop(0.12, 'rgba(50, 50, 54, 1.0)');
                grad.addColorStop(1.0, 'rgba(79, 79, 87, 1.0)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "tiltedGray":
                grad = radFCtx.createLinearGradient((0.2336448598130841 * imageWidth), (0.08411214953271028 * imageHeight), ((0.2336448598130841 + 0.5789369637935792) * imageWidth), ((0.08411214953271028 + 0.8268076708711319) * imageHeight));
                grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.07, 'rgba(210, 210, 210, 1.0)');
                grad.addColorStop(0.16, 'rgba(179, 179, 179, 1.0)');
                grad.addColorStop(0.33, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.55, 'rgba(197, 197, 197, 1.0)');
                grad.addColorStop(0.79, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(1.0, 'rgba(102, 102, 102, 1.0)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;

            case "tiltedBlack":
                grad = radFCtx.createLinearGradient((0.22897196261682243 * imageWidth), (0.0794392523364486 * imageHeight), ((0.22897196261682243 + 0.573576436351046) * imageWidth), ((0.0794392523364486 + 0.8191520442889918) * imageHeight));
                grad.addColorStop(0.0, 'rgba(102, 102, 102, 1.0)');
                grad.addColorStop(0.21, 'rgba(0, 0, 0, 1.0)');
                grad.addColorStop(0.47, 'rgba(102, 102, 102, 1.0)');
                grad.addColorStop(0.99, 'rgba(0, 0, 0, 1.0)');
                grad.addColorStop(1.0, 'rgba(0, 0, 0, 1.0)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                break;
 /*
            case "glossyMetal":
                grad = radFCtx.createRadialGradient(0.5 * imageWidth, 0.5 * imageHeight, 0, 0.5 * imageWidth, 0.5 * imageWidth, 0.5 * imageWidth);
                grad.addColorStop(0, 'rgba(207, 207, 207, 1)');
                grad.addColorStop(0.96, 'rgba(205, 204, 205, 1)');
                grad.addColorStop(1, 'rgba(244, 244, 244, 1)');
                radFCtx.fillStyle = grad;
 //               radFCtx.fill();
//                var tmp = createBuffer(imageWidth, imageHeight);
 //               tmpCtx = tmp.getContext('2d');
                radFCtx.beginPath();
                radFCtx.arc(0.0140186916 * imageWidth, 0.0140186916 * imageHeight, 0.9719626168 * imageWidth / 2, 0, Math.PI * 2);
                radFCtx.closePath();
                grad = radFCtx.createLinearGradient(0, 0, 0.9719626168 * imageHeight, 0.9719626168 * imageHeight);
        //        grad = radFCtx.createLinearGradient(0, imageHeight - 0.9719626168 * imageHeight, 0.9719626168 * imageHeight, 0.9719626168 * imageHeight);
                grad.addColorStop(0, 'rgba(249, 249, 249, 1)');
                grad.addColorStop(0.23, 'rgba(200, 195, 191, 1)');
                grad.addColorStop(0.36, 'rgba(255, 255, 255, 1)');
                grad.addColorStop(0.59, 'rgba(29, 29, 29, 1)');
                grad.addColorStop(0.76, 'rgba(200, 194, 192, 1)');
                grad.addColorStop(1, 'rgba(209, 209, 209, 1)');
                radFCtx.fillStyle = grad;
                radFCtx.fill();
                //radFCtx.drawImage(tmp, 0, 0);

                //G2.fill(FRAME_MAIN_GLOSSY2);

                //final Area FRAME_MAIN_GLOSSY3 = new Area(new Ellipse2D.Double(0.06542056074766354 * IMAGE_WIDTH, 0.06542056074766354 * IMAGE_HEIGHT, 0.8691588785046729 * IMAGE_WIDTH, 0.8691588785046729 * IMAGE_HEIGHT));
                //FRAME_MAIN_GLOSSY3.subtract(SUBTRACT);
                //G2.setColor(new Color(0xf6f6f6));
                //G2.fill(FRAME_MAIN_GLOSSY3);

                //final Area FRAME_MAIN_GLOSSY4 = new Area(new Ellipse2D.Double(FRAME_MAIN_GLOSSY3.getBounds2D().getMinX() + 2, FRAME_MAIN_GLOSSY3.getBounds2D().getMinY() + 2, FRAME_MAIN_GLOSSY3.getBounds2D().getWidth() - 4, FRAME_MAIN_GLOSSY3.getBounds2D().getHeight() - 4));
                //FRAME_MAIN_GLOSSY4.subtract(SUBTRACT);
                //G2.setColor(new Color(0x333333));
                //G2.fill(FRAME_MAIN_GLOSSY4);
                break;
*/
        }

        if ("blackMetal" === frameDesign.design) {
            fractions = [
                0.0,
                0.125,
                0.3472222222,
                0.5,
                0.6805555556,
                0.875,
                1.0
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
            radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.9906542301177979 / 2.0, 0, Math.PI * 2, true));
            outerX = imageWidth * 0.4953271028;
            innerX = imageWidth * 0.4205607477;
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(radFCtx, centerX, centerY, innerX, outerX);
            radFCtx.restore();
        }

        if ("shinyMetal" === frameDesign.design) {
            fractions = [
                0.0,
                0.125,
                0.25,
                0.3472222222,
                0.5,
                0.6527777778,
                0.75,
                0.875,
                1.0
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
            radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.9906542301177979 / 2.0, 0, Math.PI * 2, true));
            outerX = imageWidth * 0.4953271028;
            innerX = imageWidth * 0.4205607477;
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(radFCtx, centerX, centerY, innerX, outerX);
            radFCtx.restore();
        }

        if ("chrome" === frameDesign.design) {
            fractions = [
                0.0,
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
                1.0
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
            radFCtx.clip(radFCtx.arc(centerX, centerY, imageWidth * 0.9906542301177979 / 2.0, 0, Math.PI * 2, true));
            outerX = imageWidth * 0.4953271028;
            innerX = imageWidth * 0.4205607477;
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(radFCtx, centerX, centerY, innerX, outerX);
            radFCtx.restore();
        }

        // inner bright frame
        radFCtx.fillStyle = 'rgb(191, 191, 191)';
        radFCtx.beginPath();
        radFCtx.arc(centerX, centerY, imageWidth * 0.8411215543746948 / 2.0, 0, Math.PI * 2, true);
        radFCtx.closePath();
        radFCtx.fill();

        ctx.drawImage(radFBuffer, 0, 0);
        ctx.restore();

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

        roundedRectangle(linFCtx, 0, 0, imageWidth, imageHeight, 7);
        linFCtx.fillStyle = '#838383';
        linFCtx.fill();

        roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, 5);
        var grad = linFCtx.createLinearGradient(0, 1, 0, imageHeight - 1);
        // main gradient frame
        switch (frameDesign.design) {
            case "metal":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(254, 254, 254)');
                grad.addColorStop(0.07, 'rgb(210, 210, 210)');
                grad.addColorStop(0.12, 'rgb(179, 179, 179)');
                grad.addColorStop(1.0, 'rgb(213, 213, 213)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "brass":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(249, 243, 155)');
                grad.addColorStop(0.05, 'rgb(246, 226, 101)');
                grad.addColorStop(0.10, 'rgb(240, 225, 132)');
                grad.addColorStop(0.50, 'rgb(90, 57, 22)');
                grad.addColorStop(0.90, 'rgb(249, 237, 139)');
                grad.addColorStop(0.95, 'rgb(243, 226, 108)');
                grad.addColorStop(1.0, 'rgb(202, 182, 113)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "steel":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(231, 237, 237)');
                grad.addColorStop(0.05, 'rgb(189, 199, 198)');
                grad.addColorStop(0.10, 'rgb(192, 201, 200)');
                grad.addColorStop(0.50, 'rgb(23, 31, 33)');
                grad.addColorStop(0.90, 'rgb(196, 205, 204)');
                grad.addColorStop(0.95, 'rgb(194, 204, 203)');
                grad.addColorStop(1.0, 'rgb(189, 201, 199)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "gold":
                grad = linFCtx.createLinearGradient(0, imageWidth * 0.004672897048294544, 0, imageHeight * 0.9906542301177979);
                grad.addColorStop(0.0, 'rgb(255, 255, 207)');
                grad.addColorStop(0.15, 'rgb(255, 237, 96)');
                grad.addColorStop(0.22, 'rgb(254, 199, 57)');
                grad.addColorStop(0.3, 'rgb(255, 249, 203)');
                grad.addColorStop(0.38, 'rgb(255, 199, 64)');
                grad.addColorStop(0.44, 'rgb(252, 194, 60)');
                grad.addColorStop(0.51, 'rgb(255, 204, 59)');
                grad.addColorStop(0.6, 'rgb(213, 134, 29)');
                grad.addColorStop(0.68, 'rgb(255, 201, 56)');
                grad.addColorStop(0.75, 'rgb(212, 135, 29)');
                grad.addColorStop(1.0, 'rgb(247, 238, 101)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "anthracite":
                grad = linFCtx.createLinearGradient((0.5 * imageWidth), (0.004672897196261682 * imageHeight), ((0.5 + 6.066007509795301E-17) * imageWidth), ((0.004672897196261682 + 0.9906542056074766) * imageHeight));
                grad.addColorStop(0.0, 'rgba(118, 117, 135, 1.0)');
                grad.addColorStop(0.06, 'rgba(74, 74, 82, 1.0)');
                grad.addColorStop(0.12, 'rgba(50, 50, 54, 1.0)');
                grad.addColorStop(1.0, 'rgba(79, 79, 87, 1.0)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "tiltedGray":
                grad = linFCtx.createLinearGradient((0.2336448598130841 * imageWidth), (0.08411214953271028 * imageHeight), ((0.2336448598130841 + 0.5789369637935792) * imageWidth), ((0.08411214953271028 + 0.8268076708711319) * imageHeight));
                grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.07, 'rgba(210, 210, 210, 1.0)');
                grad.addColorStop(0.16, 'rgba(179, 179, 179, 1.0)');
                grad.addColorStop(0.33, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.55, 'rgba(197, 197, 197, 1.0)');
                grad.addColorStop(0.79, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(1.0, 'rgba(102, 102, 102, 1.0)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;

            case "tiltedBlack":
                grad = linFCtx.createLinearGradient((0.22897196261682243 * imageWidth), (0.0794392523364486 * imageHeight), ((0.22897196261682243 + 0.573576436351046) * imageWidth), ((0.0794392523364486 + 0.8191520442889918) * imageHeight));
                grad.addColorStop(0.0, 'rgba(102, 102, 102, 1.0)');
                grad.addColorStop(0.21, 'rgba(0, 0, 0, 1.0)');
                grad.addColorStop(0.47, 'rgba(102, 102, 102, 1.0)');
                grad.addColorStop(0.99, 'rgba(0, 0, 0, 1.0)');
                grad.addColorStop(1.0, 'rgba(0, 0, 0, 1.0)');
                linFCtx.fillStyle = grad;
                linFCtx.fill();
                break;
        }

        if ("blackMetal" === frameDesign.design) {
            fractions = [
                0.0,
                0.125,
                0.3472222222,
                0.5,
                0.6805555556,
                0.875,
                1.0
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

            if (vertical) {
                outerX = imageHeight;
                innerX = 0;
            } else {
                outerX = imageWidth;
                innerX = 0;
            }
            // Set the clip
            linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, 5));
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
        }

        if ("shinyMetal" === frameDesign.design) {
            fractions = [
                0.0,
                0.125,
                0.25,
                0.3472222222,
                0.5,
                0.6527777778,
                0.75,
                0.875,
                1.0
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

            if (vertical) {
                outerX = imageHeight;
                innerX = 0;
            } else {
                outerX = imageWidth;
                innerX = 0;
            }
            // Set the clip
            linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, 5));
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
        }

        if ("chrome" === frameDesign.design) {
            fractions = [
                0.0,
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
                1.0
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
            if (vertical) {
                outerX = imageHeight;
                innerX = 0;
            } else {
                outerX = imageWidth;
                innerX = 0;
            }
            // Set the clip
            linFCtx.clip(roundedRectangle(linFCtx, 1, 1, imageWidth - 2, imageHeight - 2, 5));
            grad = new conicalGradient(fractions, colors, -Math.PI / 2);
            grad.fill(linFCtx, imageWidth / 2, imageHeight / 2, innerX, outerX);
        }

        roundedRectangle(linFCtx, 13, 13, imageWidth - 26, imageHeight - 26, 4);
        linFCtx.fillStyle = 'rgb(192, 192, 192)';
        linFCtx.fill();

        ctx.drawImage(linFBuffer, 0, 0);

        ctx.restore();
    };

    var drawRadialBackgroundImage = function(ctx, backgroundColor, centerX, centerY, imageWidth, imageHeight) {
        ctx.save();

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
        radBCtx.arc(centerX, centerY, imageWidth * 0.8317756652832031 / 2.0, 0, Math.PI * 2, true);
        radBCtx.closePath();

        // If the backgroundColor is a texture fill it with the texture instead of the gradient
        if (backgroundColor === steelseries.BackgroundColor.CARBON || backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
            if (backgroundColor === steelseries.BackgroundColor.CARBON) {
                radBCtx.fillStyle = radBCtx.createPattern(carbonBuffer, 'repeat');
                radBCtx.fill();
            }

            if (backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
                radBCtx.fillStyle = radBCtx.createPattern(punchedSheetBuffer, 'repeat');
                radBCtx.fill();
            }
            // Add another inner shadow to make the look more realistic
            var backgroundOffsetX = imageWidth * 0.8317756652832031 / 2.0;
            var fadeGradient = radBCtx.createLinearGradient(backgroundOffsetX, 0, imageWidth - backgroundOffsetX, 0);
            fadeGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0.25)');
            fadeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
            fadeGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.25)');
            radBCtx.fillStyle = fadeGradient;
            radBCtx.beginPath();
            radBCtx.arc(centerX, centerY, imageWidth * 0.8317756652832031 / 2.0, 0, Math.PI * 2, true);
            radBCtx.closePath();
            radBCtx.fill();
        } else {
            var grad = radBCtx.createLinearGradient(0, imageWidth * 0.08411215245723724, 0, imageHeight * 0.8317756652832031);
            grad.addColorStop(0.0, backgroundColor.gradientStart.getRgbaColor());
            grad.addColorStop(0.4, backgroundColor.gradientFraction.getRgbaColor());
            grad.addColorStop(1.0, backgroundColor.gradientStop.getRgbaColor());
            radBCtx.fillStyle = grad;
            radBCtx.fill();
        }

        // Inner shadow
        var gradInnerShadow = radBCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, imageWidth * 0.8317756652832031 / 2);
        gradInnerShadow.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.71, 'rgba(0, 0, 0, 0)');
        gradInnerShadow.addColorStop(0.86, 'rgba(0, 0, 0, 0.03)');
        gradInnerShadow.addColorStop(0.92, 'rgba(0, 0, 0, 0.07)');
        gradInnerShadow.addColorStop(0.97, 'rgba(0, 0, 0, 0.15)');
        gradInnerShadow.addColorStop(1.0, 'rgba(0, 0, 0, 0.3)');
        radBCtx.fillStyle = gradInnerShadow;

        radBCtx.beginPath();
        radBCtx.arc(centerX, centerY, imageWidth * 0.8317756652832031 / 2.0, 0, Math.PI * 2, true);
        radBCtx.closePath();
        radBCtx.fill();


        ctx.drawImage(radBBuffer, 0, 0);
        ctx.restore();

        return this;
    };

    var drawRadialCustomImage = function(ctx, img, centerX, centerY, imageWidth, imageHeight) {
        if (img !== null && img.height > 0 && img.width > 0) {
            ctx.save();
            // Set the clipping area
            ctx.beginPath();
            ctx.arc(centerX, centerY, imageWidth * 0.8317756652832031 / 2.0, 0, Math.PI * 2, true);
            ctx.clip();
            // Add the image
            var drawWidth = imageWidth * 0.8317756652832031;
            var drawHeight = imageHeight * 0.8317756652832031;
            var x = (imageWidth - drawWidth) / 2;
            var y = (imageHeight - drawHeight) / 2;
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            ctx.restore();
            return this;
        }
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
        if (backgroundColor === steelseries.BackgroundColor.CARBON || backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
            if (backgroundColor === steelseries.BackgroundColor.CARBON) {
                linBCtx.fillStyle = linBCtx.createPattern(carbonBuffer, 'repeat');
                linBCtx.fill();
            }

            if (backgroundColor === steelseries.BackgroundColor.PUNCHED_SHEET) {
                linBCtx.fillStyle = linBCtx.createPattern(punchedSheetBuffer, 'repeat');
                linBCtx.fill();
            }
            // Add an additional inner shadow to make the look mor realistic
            var fadeGradient = linBCtx.createLinearGradient(14, 14, imageWidth - 28, imageHeight -28);
            fadeGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0.25)');
            fadeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
            fadeGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.25)');
            linBCtx.fillStyle = fadeGradient;
            roundedRectangle(linBCtx, 14, 14, imageWidth - 28, imageHeight - 28, 4);
            linBCtx.fill();
        } else {
            var grad = linBCtx.createLinearGradient((0.5 * imageWidth), 14, (0.5 * imageWidth), imageHeight - 28);
            grad.addColorStop(0.0, backgroundColor.gradientStart.getRgbaColor());
            grad.addColorStop(0.4, backgroundColor.gradientFraction.getRgbaColor());
            grad.addColorStop(1.0, backgroundColor.gradientStop.getRgbaColor());
            linBCtx.fillStyle = grad;
            linBCtx.fill();
        }
        // Add a simple inner shadow
        var colors = new Array('rgba(0, 0, 0, 0.3)',
            'rgba(0, 0, 0, 0.15)',
            'rgba(0, 0, 0, 0.07)',
            'rgba(0, 0, 0, 0.03)',
            'rgba(0, 0, 0, 0.0)',
            'rgba(0, 0, 0, 0.0)',
            'rgba(0, 0, 0, 0.0)');

        for (var i = 0 ; i < 7 ; i++) {
            roundedRectangle(linBCtx, 14 + i, 14 + i, imageWidth - 28 - (2 * i), imageHeight - 28 - (2 * i), 4);
            linBCtx.strokeStyle=colors[i];
            linBCtx.stroke();
        }

        ctx.drawImage(linBBuffer, 0, 0);

        ctx.restore();
    };

    var drawRadialForegroundImage = function(ctx, foregroundType, imageWidth, imageHeight, withCenterKnob, knob, style, gaugeType, orientation) {
        ctx.save();

        if (imageWidth === radFgBuffer.width && imageHeight === radFgBuffer.height && withCenterKnob === radWithKnob && knob === radKnob && style === radFgStyle && radGaugeType === gaugeType && radOrientation === orientation) {
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
        var radFgCtx = radFgBuffer.getContext('2d');

        var shadowOffset = imageWidth * 0.008;
        // center post
        if (withCenterKnob) {
            if (gaugeType === steelseries.GaugeType.TYPE5) {
                if (steelseries.Orientation.WEST === orientation) {
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, true), imageWidth * 0.6933333333 + shadowOffset, imageHeight * 0.4579439163208008 + shadowOffset);
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, false), imageWidth * 0.6933333333, imageHeight * 0.4579439163208008);
                } else {
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, true), imageWidth * 0.4579439163208008 + shadowOffset, imageHeight * 0.6915887594223022 + shadowOffset);
                    radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, false), imageWidth * 0.4579439163208008, imageHeight * 0.6915887594223022);
                }
            } else {
                radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, true), imageWidth * 0.4579439163208008 + shadowOffset, imageHeight * 0.4579439163208008 + shadowOffset);
                radFgCtx.drawImage(createKnobImage(Math.ceil(imageHeight * 0.08411216735839844), knob, style, false), imageWidth * 0.4579439163208008, imageHeight * 0.4579439163208008);
            }
        }

        // highlight
        var gradHighlight;

        switch (foregroundType.type) {
            case 'type2':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.13551401869158877, imageHeight * 0.6962616822429907);
                radFgCtx.bezierCurveTo(imageWidth * 0.21495327102803738, imageHeight * 0.5887850467289719, imageWidth * 0.3177570093457944, imageHeight * 0.5, imageWidth * 0.46261682242990654, imageHeight * 0.4252336448598131);
                radFgCtx.bezierCurveTo(imageWidth * 0.6121495327102804, imageHeight * 0.34579439252336447, imageWidth * 0.7336448598130841, imageHeight * 0.3177570093457944, imageWidth * 0.8738317757009346, imageHeight * 0.32242990654205606);
                radFgCtx.bezierCurveTo(imageWidth * 0.7663551401869159, imageHeight * 0.11214953271028037, imageWidth * 0.5280373831775701, imageHeight * 0.02336448598130841, imageWidth * 0.3130841121495327, imageHeight * 0.1308411214953271);
                radFgCtx.bezierCurveTo(imageWidth * 0.09813084112149532, imageHeight * 0.2383177570093458, imageWidth * 0.028037383177570093, imageHeight * 0.48598130841121495, imageWidth * 0.13551401869158877, imageHeight * 0.6962616822429907);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient((0.3130841121495327 * imageWidth), (0.13551401869158877 * imageHeight), ((0.3130841121495327 + 0.1824447802691637) * imageWidth), ((0.13551401869158877 + 0.3580680424308394) * imageHeight));
                gradHighlight.addColorStop(0.0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1.0, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type3':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.08411214953271028, imageHeight * 0.5093457943925234);
                radFgCtx.bezierCurveTo(imageWidth * 0.2102803738317757, imageHeight * 0.5560747663551402, imageWidth * 0.46261682242990654, imageHeight * 0.5607476635514018, imageWidth * 0.5, imageHeight * 0.5607476635514018);
                radFgCtx.bezierCurveTo(imageWidth * 0.5373831775700935, imageHeight * 0.5607476635514018, imageWidth * 0.794392523364486, imageHeight * 0.5607476635514018, imageWidth * 0.9158878504672897, imageHeight * 0.5093457943925234);
                radFgCtx.bezierCurveTo(imageWidth * 0.9158878504672897, imageHeight * 0.2757009345794392, imageWidth * 0.7383177570093458, imageHeight * 0.08411214953271028, imageWidth * 0.5, imageHeight * 0.08411214953271028);
                radFgCtx.bezierCurveTo(imageWidth * 0.2616822429906542, imageHeight * 0.08411214953271028, imageWidth * 0.08411214953271028, imageHeight * 0.2757009345794392, imageWidth * 0.08411214953271028, imageHeight * 0.5093457943925234);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient((0.5 * imageWidth), (0.09345794392523364 * imageHeight), ((0.5 + 2.8327110541025226E-17) * imageWidth), ((0.09345794392523364 + 0.46261682242990654) * imageHeight));
                gradHighlight.addColorStop(0.0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1.0, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type4':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.677570093457944, imageHeight * 0.24299065420560748);
                radFgCtx.bezierCurveTo(imageWidth * 0.7710280373831776, imageHeight * 0.308411214953271, imageWidth * 0.822429906542056, imageHeight * 0.411214953271028, imageWidth * 0.8130841121495327, imageHeight * 0.5280373831775701);
                radFgCtx.bezierCurveTo(imageWidth * 0.7990654205607477, imageHeight * 0.6542056074766355, imageWidth * 0.719626168224299, imageHeight * 0.7570093457943925, imageWidth * 0.5934579439252337, imageHeight * 0.7990654205607477);
                radFgCtx.bezierCurveTo(imageWidth * 0.48598130841121495, imageHeight * 0.8317757009345794, imageWidth * 0.3691588785046729, imageHeight * 0.8084112149532711, imageWidth * 0.2850467289719626, imageHeight * 0.7289719626168224);
                radFgCtx.bezierCurveTo(imageWidth * 0.2757009345794392, imageHeight * 0.719626168224299, imageWidth * 0.2523364485981308, imageHeight * 0.7149532710280374, imageWidth * 0.2336448598130841, imageHeight * 0.7289719626168224);
                radFgCtx.bezierCurveTo(imageWidth * 0.21495327102803738, imageHeight * 0.7476635514018691, imageWidth * 0.21962616822429906, imageHeight * 0.7710280373831776, imageWidth * 0.22897196261682243, imageHeight * 0.7757009345794392);
                radFgCtx.bezierCurveTo(imageWidth * 0.3317757009345794, imageHeight * 0.8785046728971962, imageWidth * 0.4766355140186916, imageHeight * 0.9158878504672897, imageWidth * 0.616822429906542, imageHeight * 0.8691588785046729);
                radFgCtx.bezierCurveTo(imageWidth * 0.7710280373831776, imageHeight * 0.822429906542056, imageWidth * 0.8738317757009346, imageHeight * 0.6915887850467289, imageWidth * 0.8878504672897196, imageHeight * 0.5327102803738317);
                radFgCtx.bezierCurveTo(imageWidth * 0.897196261682243, imageHeight * 0.3878504672897196, imageWidth * 0.8364485981308412, imageHeight * 0.2570093457943925, imageWidth * 0.719626168224299, imageHeight * 0.1822429906542056);
                radFgCtx.bezierCurveTo(imageWidth * 0.705607476635514, imageHeight * 0.17289719626168223, imageWidth * 0.6822429906542056, imageHeight * 0.16355140186915887, imageWidth * 0.6635514018691588, imageHeight * 0.18691588785046728);
                radFgCtx.bezierCurveTo(imageWidth * 0.6542056074766355, imageHeight * 0.205607476635514, imageWidth * 0.6682242990654206, imageHeight * 0.2383177570093458, imageWidth * 0.677570093457944, imageHeight * 0.24299065420560748);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createRadialGradient((0.5) * imageWidth, ((0.5) * imageHeight), 0, ((0.5) * imageWidth), ((0.5) * imageHeight), 0.3878504672897196 * imageWidth);
                gradHighlight.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
                gradHighlight.addColorStop(0.82, 'rgba(255, 255, 255, 0.0)');
                gradHighlight.addColorStop(0.83, 'rgba(255, 255, 255, 0.0)');
                gradHighlight.addColorStop(1.0, 'rgba(255, 255, 255, 0.15)');

                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.2616822429906542, imageHeight * 0.22429906542056074);
                radFgCtx.bezierCurveTo(imageWidth * 0.2850467289719626, imageHeight * 0.2383177570093458, imageWidth * 0.2523364485981308, imageHeight * 0.2850467289719626, imageWidth * 0.24299065420560748, imageHeight * 0.3177570093457944);
                radFgCtx.bezierCurveTo(imageWidth * 0.24299065420560748, imageHeight * 0.35046728971962615, imageWidth * 0.27102803738317754, imageHeight * 0.38317757009345793, imageWidth * 0.27102803738317754, imageHeight * 0.397196261682243);
                radFgCtx.bezierCurveTo(imageWidth * 0.2757009345794392, imageHeight * 0.4158878504672897, imageWidth * 0.2616822429906542, imageHeight * 0.45794392523364486, imageWidth * 0.2383177570093458, imageHeight * 0.5093457943925234);
                radFgCtx.bezierCurveTo(imageWidth * 0.22429906542056074, imageHeight * 0.5420560747663551, imageWidth * 0.17757009345794392, imageHeight * 0.6121495327102804, imageWidth * 0.1588785046728972, imageHeight * 0.6121495327102804);
                radFgCtx.bezierCurveTo(imageWidth * 0.14485981308411214, imageHeight * 0.6121495327102804, imageWidth * 0.08878504672897196, imageHeight * 0.5467289719626168, imageWidth * 0.1308411214953271, imageHeight * 0.3691588785046729);
                radFgCtx.bezierCurveTo(imageWidth * 0.14018691588785046, imageHeight * 0.3364485981308411, imageWidth * 0.21495327102803738, imageHeight * 0.20093457943925233, imageWidth * 0.2616822429906542, imageHeight * 0.22429906542056074);
                radFgCtx.closePath();
                var gradHighlight2 = radFgCtx.createLinearGradient((0.1308411214953271 * imageWidth), (0.3691588785046729 * imageHeight), ((0.1308411214953271 + 0.1429988420131642) * imageWidth), ((0.3691588785046729 + 0.04371913341648399) * imageHeight));
                gradHighlight2.addColorStop(0.0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight2.addColorStop(1.0, 'rgba(255, 255, 255, 0.015)');
                radFgCtx.fillStyle = gradHighlight2;
                radFgCtx.fill();
                break;

            case 'type5':
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.08411214953271028, imageHeight * 0.5);
                radFgCtx.bezierCurveTo(imageWidth * 0.08411214953271028, imageHeight * 0.27102803738317754, imageWidth * 0.27102803738317754, imageHeight * 0.08411214953271028, imageWidth * 0.5, imageHeight * 0.08411214953271028);
                radFgCtx.bezierCurveTo(imageWidth * 0.7009345794392523, imageHeight * 0.08411214953271028, imageWidth * 0.8644859813084113, imageHeight * 0.22429906542056074, imageWidth * 0.9065420560747663, imageHeight * 0.411214953271028);
                radFgCtx.bezierCurveTo(imageWidth * 0.9112149532710281, imageHeight * 0.4392523364485981, imageWidth * 0.9112149532710281, imageHeight * 0.5186915887850467, imageWidth * 0.8457943925233645, imageHeight * 0.5373831775700935);
                radFgCtx.bezierCurveTo(imageWidth * 0.794392523364486, imageHeight * 0.5467289719626168, imageWidth * 0.5514018691588785, imageHeight * 0.411214953271028, imageWidth * 0.3925233644859813, imageHeight * 0.45794392523364486);
                radFgCtx.bezierCurveTo(imageWidth * 0.16822429906542055, imageHeight * 0.5093457943925234, imageWidth * 0.13551401869158877, imageHeight * 0.7757009345794392, imageWidth * 0.09345794392523364, imageHeight * 0.5934579439252337);
                radFgCtx.bezierCurveTo(imageWidth * 0.08878504672897196, imageHeight * 0.5607476635514018, imageWidth * 0.08411214953271028, imageHeight * 0.5327102803738317, imageWidth * 0.08411214953271028, imageHeight * 0.5);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient((0.5 * imageWidth), (0.08411214953271028 * imageHeight), ((0.5 + 3.4335891564879063E-17) * imageWidth), ((0.08411214953271028 + 0.5607476635514018) * imageHeight));
                gradHighlight.addColorStop(0.0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1.0, 'rgba(255, 255, 255, 0.015)');
                break;

            case 'type1':
            default:
                radFgCtx.beginPath();
                radFgCtx.moveTo(imageWidth * 0.08411214953271028, imageHeight * 0.5093457943925234);
                radFgCtx.bezierCurveTo(imageWidth * 0.205607476635514, imageHeight * 0.4485981308411215, imageWidth * 0.3364485981308411, imageHeight * 0.4158878504672897, imageWidth * 0.5, imageHeight * 0.4158878504672897);
                radFgCtx.bezierCurveTo(imageWidth * 0.6728971962616822, imageHeight * 0.4158878504672897, imageWidth * 0.7897196261682243, imageHeight * 0.4439252336448598, imageWidth * 0.9158878504672897, imageHeight * 0.5093457943925234);
                radFgCtx.bezierCurveTo(imageWidth * 0.9158878504672897, imageHeight * 0.2757009345794392, imageWidth * 0.7383177570093458, imageHeight * 0.08411214953271028, imageWidth * 0.5, imageHeight * 0.08411214953271028);
                radFgCtx.bezierCurveTo(imageWidth * 0.2616822429906542, imageHeight * 0.08411214953271028, imageWidth * 0.08411214953271028, imageHeight * 0.2757009345794392, imageWidth * 0.08411214953271028, imageHeight * 0.5093457943925234);
                radFgCtx.closePath();
                gradHighlight = radFgCtx.createLinearGradient((0.5 * imageWidth), (0.08878504672897196 * imageHeight), ((0.5 + 2.4607388954829992E-17) * imageWidth), ((0.08878504672897196 + 0.40186915887850466) * imageHeight));
                gradHighlight.addColorStop(0.0, 'rgba(255, 255, 255, 0.275)');
                gradHighlight.addColorStop(1.0, 'rgba(255, 255, 255, 0.015)');
                break;
        }
        radFgCtx.fillStyle = gradHighlight;
        radFgCtx.fill();

        ctx.drawImage(radFgBuffer, 0, 0);

        ctx.restore();
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

        if (vertical) {
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

            var foregroundVerticalGradient = linFgCtx.createLinearGradient(14, 14, (imageWidth - 14), 14);
            foregroundVerticalGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.06, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.07, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.17, 'rgba(255, 255, 255, 0.013546027058405213)');
            foregroundVerticalGradient.addColorStop(0.1701, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.79, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(0.84, 'rgba(255, 255, 255, 0.08221792379163773)');
            foregroundVerticalGradient.addColorStop(0.93, 'rgba(255, 255, 255, 0.28870208718130996)');
            foregroundVerticalGradient.addColorStop(0.94, 'rgba(255, 255, 255, 0.2980392156862745)');
            foregroundVerticalGradient.addColorStop(0.96, 'rgba(255, 255, 255, 0.11921357588884376)');
            foregroundVerticalGradient.addColorStop(0.97, 'rgba(255, 255, 255, 0.0)');
            foregroundVerticalGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
            linFgCtx.fillStyle = foregroundVerticalGradient;
            linFgCtx.fill();
        } else {
            // GLASSEFFECT_HORIZONTAL
            linFgCtx.save();
            linFgCtx.beginPath();
            linFgCtx.moveTo(18, imageHeight - 18);
            linFgCtx.lineTo(imageWidth - 18, imageHeight - 18);
            linFgCtx.bezierCurveTo(imageWidth - 18, imageHeight - 18, imageWidth - 27, imageHeight * 0.7, imageWidth - 27, imageHeight * 0.5);
            linFgCtx.bezierCurveTo(imageWidth - 27, 27, imageWidth - 18, 18, imageWidth - 18, 18);
            linFgCtx.lineTo(18, 18);
            linFgCtx.bezierCurveTo(18, 18, 27, imageHeight * 0.2857142857142857, 27, imageHeight * 0.5);
            linFgCtx.bezierCurveTo(27, imageHeight * 0.7, 18, imageHeight - 18, 18, imageHeight - 18);
            linFgCtx.closePath();

            var foregroundHorizontalGradient = linFgCtx.createLinearGradient(14, (imageHeight - 14), 14, 14);
            foregroundHorizontalGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.06, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.07, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.17, 'rgba(255, 255, 255, 0.013546027058405213)');
            foregroundHorizontalGradient.addColorStop(0.1701, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.79, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(0.84, 'rgba(255, 255, 255, 0.08221792379163773)');
            foregroundHorizontalGradient.addColorStop(0.93, 'rgba(255, 255, 255, 0.28870208718130996)');
            foregroundHorizontalGradient.addColorStop(0.94, 'rgba(255, 255, 255, 0.2980392156862745)');
            foregroundHorizontalGradient.addColorStop(0.96, 'rgba(255, 255, 255, 0.11921357588884376)');
            foregroundHorizontalGradient.addColorStop(0.97, 'rgba(255, 255, 255, 0.0)');
            foregroundHorizontalGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
            linFgCtx.fillStyle = foregroundHorizontalGradient;
            linFgCtx.fill();
        }

        ctx.drawImage(linFgBuffer, 0, 0);

        ctx.restore();
    };

    var createKnobImage = function(size, knob, style, shadow) {
        var knobBuffer = doc.createElement('canvas');
        knobBuffer.width = size;
        knobBuffer.height = size;
        var knobCtx = knobBuffer.getContext('2d');

        knobCtx.save();
        var maxPostCenterX = size / 2.0;
        var maxPostCenterY = size / 2.0;

        if (shadow) {
                knobCtx.shadowColor = 'rgba(0, 0, 0, 1)';
                knobCtx.shadowBlur = 3;
                knobCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                knobCtx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        }

        switch(knob.type) {

            case 'metalKnob':
                // METALKNOB_FRAME
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(0.0, size * 0.5);
                knobCtx.bezierCurveTo(0.0, size * 0.2222222222222222, size * 0.2222222222222222, 0.0, size * 0.5, 0.0);
                knobCtx.bezierCurveTo(size * 0.7777777777777778, 0.0, size, size * 0.2222222222222222, size, size * 0.5);
                knobCtx.bezierCurveTo(size, size * 0.7777777777777778, size * 0.7777777777777778, size, size * 0.5, size);
                knobCtx.bezierCurveTo(size * 0.2222222222222222, size, 0.0, size * 0.7777777777777778, 0.0, size * 0.5);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobFrameGradient = knobCtx.createLinearGradient((0.5 * size), (0), ((0.5 + 6.123233995736766E-17) * size), size);
                    metalKnobFrameGradient.addColorStop(0.0, 'rgba(92, 95, 101, 1.0)');
                    metalKnobFrameGradient.addColorStop(0.47, 'rgba(46, 49, 53, 1.0)');
                    metalKnobFrameGradient.addColorStop(1.0, 'rgba(22, 23, 26, 1.0)');
                    knobCtx.fillStyle = metalKnobFrameGradient;
                }
                knobCtx.fill();

                // METALKNOB_MAIN
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.05555555555555555, size * 0.5);
                knobCtx.bezierCurveTo(size * 0.05555555555555555, size * 0.2777777777777778, size * 0.2777777777777778, size * 0.05555555555555555, size * 0.5, size * 0.05555555555555555);
                knobCtx.bezierCurveTo(size * 0.7222222222222222, size * 0.05555555555555555, size * 0.9444444444444444, size * 0.2777777777777778, size * 0.9444444444444444, size * 0.5);
                knobCtx.bezierCurveTo(size * 0.9444444444444444, size * 0.7222222222222222, size * 0.7222222222222222, size * 0.9444444444444444, size * 0.5, size * 0.9444444444444444);
                knobCtx.bezierCurveTo(size * 0.2777777777777778, size * 0.9444444444444444, size * 0.05555555555555555, size * 0.7222222222222222, size * 0.05555555555555555, size * 0.5);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobMainGradient = knobCtx.createLinearGradient((0.5 * size), (0.05555555555555555 * size), ((0.5 + 5.442874662877125E-17) * size), ((0.05555555555555555 + 0.8888888888888888) * size));
                    switch(style.style) {

                        case 'black':
                            metalKnobMainGradient.addColorStop(0.0, 'rgba(43, 42, 47, 1.0)');
                            metalKnobMainGradient.addColorStop(1.0, 'rgba(26, 27, 32, 1.0)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;

                        case 'brass':
                            metalKnobMainGradient.addColorStop(0.0, 'rgba(150, 110, 54, 1.0)');
                            metalKnobMainGradient.addColorStop(1.0, 'rgba(124, 95, 61, 1.0)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;

                        case 'silver':
                        default:
                            metalKnobMainGradient.addColorStop(0.0, 'rgba(204, 204, 204, 1.0)');
                            metalKnobMainGradient.addColorStop(1.0, 'rgba(87, 92, 98, 1.0)');
                            knobCtx.fillStyle = metalKnobMainGradient;
                            knobCtx.fill();
                            break;
                    }
                } else {
                    knobCtx.fill();
                }

                // METALKNOB_LOWERHL
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.7777777777777778, size * 0.8333333333333334);
                knobCtx.bezierCurveTo(size * 0.7222222222222222, size * 0.7222222222222222, size * 0.6111111111111112, size * 0.6666666666666666, size * 0.5, size * 0.6666666666666666);
                knobCtx.bezierCurveTo(size * 0.3888888888888889, size * 0.6666666666666666, size * 0.2777777777777778, size * 0.7222222222222222, size * 0.2222222222222222, size * 0.8333333333333334);
                knobCtx.bezierCurveTo(size * 0.2777777777777778, size * 0.8888888888888888, size * 0.3888888888888889, size * 0.9444444444444444, size * 0.5, size * 0.9444444444444444);
                knobCtx.bezierCurveTo(size * 0.6111111111111112, size * 0.9444444444444444, size * 0.7222222222222222, size * 0.8888888888888888, size * 0.7777777777777778, size * 0.8333333333333334);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobLowerHlGradient = knobCtx.createRadialGradient((0.5555555555555556) * size, ((0.9444444444444444) * size), 0, ((0.5555555555555556) * size), ((0.9444444444444444) * size), 0.3888888888888889 * size);
                    metalKnobLowerHlGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.6)');
                    metalKnobLowerHlGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
                    knobCtx.fillStyle = metalKnobLowerHlGradient;
                }
                knobCtx.fill();

                // METALKNOB_UPPERHL
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.9444444444444444, size * 0.2777777777777778);
                knobCtx.bezierCurveTo(size * 0.8333333333333334, size * 0.1111111111111111, size * 0.6666666666666666, 0, size * 0.5, 0);
                knobCtx.bezierCurveTo(size * 0.3333333333333333, 0, size * 0.16666666666666666, size * 0.1111111111111111, size * 0.05555555555555555, size * 0.2777777777777778);
                knobCtx.bezierCurveTo(size * 0.16666666666666666, size * 0.3333333333333333, size * 0.3333333333333333, size * 0.3888888888888889, size * 0.5, size * 0.3888888888888889);
                knobCtx.bezierCurveTo(size * 0.6666666666666666, size * 0.3888888888888889, size * 0.8333333333333334, size * 0.3333333333333333, size * 0.9444444444444444, size * 0.2777777777777778);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobUpperHlGradient = knobCtx.createRadialGradient(0.5 * size, 0.0, 0, ((0.5) * size), 0.0, 0.5833333333333334 * size);
                    metalKnobUpperHlGradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.7490196078431373)');
                    metalKnobUpperHlGradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
                    knobCtx.fillStyle = metalKnobUpperHlGradient;
                }
                knobCtx.fill();

                // METALKNOB_INNERFRAME
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.2777777777777778, size * 0.5555555555555556);
                knobCtx.bezierCurveTo(size * 0.2777777777777778, size * 0.3888888888888889, size * 0.3888888888888889, size * 0.2777777777777778, size * 0.5, size * 0.2777777777777778);
                knobCtx.bezierCurveTo(size * 0.6111111111111112, size * 0.2777777777777778, size * 0.7777777777777778, size * 0.3888888888888889, size * 0.7777777777777778, size * 0.5555555555555556);
                knobCtx.bezierCurveTo(size * 0.7777777777777778, size * 0.6666666666666666, size * 0.6111111111111112, size * 0.7777777777777778, size * 0.5, size * 0.7777777777777778);
                knobCtx.bezierCurveTo(size * 0.3888888888888889, size * 0.7777777777777778, size * 0.2777777777777778, size * 0.6666666666666666, size * 0.2777777777777778, size * 0.5555555555555556);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobInnerFrameGradient = knobCtx.createLinearGradient((0.5 * size), (0.2777777777777778 * size), ((0.5 + 2.7214373314385625E-17) * size), ((0.2777777777777778 + 0.4444444444444444) * size));
                    metalKnobInnerFrameGradient.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
                    metalKnobInnerFrameGradient.addColorStop(1.0, 'rgba(204, 204, 204, 1.0)');
                    knobCtx.fillStyle = metalKnobInnerFrameGradient;
                }
                knobCtx.fill();

                // METALKNOB_INNERBACKGROUND
                knobCtx.save();
                knobCtx.beginPath();
                knobCtx.moveTo(size * 0.3333333333333333, size * 0.5555555555555556);
                knobCtx.bezierCurveTo(size * 0.3333333333333333, size * 0.4444444444444444, size * 0.3888888888888889, size * 0.3333333333333333, size * 0.5, size * 0.3333333333333333);
                knobCtx.bezierCurveTo(size * 0.6111111111111112, size * 0.3333333333333333, size * 0.7222222222222222, size * 0.4444444444444444, size * 0.7222222222222222, size * 0.5555555555555556);
                knobCtx.bezierCurveTo(size * 0.7222222222222222, size * 0.6111111111111112, size * 0.6111111111111112, size * 0.7222222222222222, size * 0.5, size * 0.7222222222222222);
                knobCtx.bezierCurveTo(size * 0.3888888888888889, size * 0.7222222222222222, size * 0.3333333333333333, size * 0.6111111111111112, size * 0.3333333333333333, size * 0.5555555555555556);
                knobCtx.closePath();
                if (!shadow) {
                    var metalKnobInnerBackgroundGradient = knobCtx.createLinearGradient((0.5 * size), (0.3333333333333333 * size), ((0.5 + 2.041077998578922E-17) * size), ((0.3333333333333333 + 0.3333333333333333) * size));
                    metalKnobInnerBackgroundGradient.addColorStop(0.0, 'rgba(10, 9, 1, 1.0)');
                    metalKnobInnerBackgroundGradient.addColorStop(1.0, 'rgba(42, 41, 37, 1.0)');
                    knobCtx.fillStyle = metalKnobInnerBackgroundGradient;
                }
                knobCtx.fill();
                break;

            case 'standardKnob':
                if (!shadow) {
                    var stdKnobFrameGradient = knobCtx.createLinearGradient(0, 0, 0, size);
                    stdKnobFrameGradient.addColorStop(0.0, 'rgb(180, 180, 180)');
                    stdKnobFrameGradient.addColorStop(0.46, 'rgb(63, 63, 63)');
                    stdKnobFrameGradient.addColorStop(1.0, 'rgb(40, 40, 40)');
                    knobCtx.fillStyle = stdKnobFrameGradient;
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size / 2.0, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();
                knobCtx.restore();

                knobCtx.save();
                if (!shadow) {
                    var stdKnobMainGradient = knobCtx.createLinearGradient(0, size - size * 0.77, 0, size - size * 0.77 + size * 0.77);
                    switch(style.style) {

                        case 'black':
                            stdKnobMainGradient.addColorStop(0.0, 'rgba(191, 191, 191, 1.0)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgba(45, 44, 49, 1.0)');
                            stdKnobMainGradient.addColorStop(1.0, 'rgba(125, 126, 128, 1.0)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;

                        case 'brass':
                            stdKnobMainGradient.addColorStop(0.0, 'rgba(223, 208, 174, 1.0)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgba(123, 95, 63, 1.0)');
                            stdKnobMainGradient.addColorStop(1.0, 'rgba(207, 190, 157, 1.0)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;

                        case 'silver':
                        default:
                            stdKnobMainGradient.addColorStop(0.0, 'rgba(215, 215, 215, 1.0)');
                            stdKnobMainGradient.addColorStop(0.5, 'rgba(116, 116, 116, 1.0)');
                            stdKnobMainGradient.addColorStop(1.0, 'rgba(215, 215, 215, 1.0)');
                            knobCtx.fillStyle = stdKnobMainGradient;
                            break;
                    }
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size * 0.77 / 2.0, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();
                knobCtx.restore();

                knobCtx.save();
                if (!shadow) {
                    var stdKnobInnerShadowGradient = knobCtx.createRadialGradient(maxPostCenterX, maxPostCenterY, 0, maxPostCenterX, maxPostCenterY, size * 0.77 / 2.0);
                    stdKnobInnerShadowGradient.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
                    stdKnobInnerShadowGradient.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
                    stdKnobInnerShadowGradient.addColorStop(0.76, 'rgba(0, 0, 0, 0.01)');
                    stdKnobInnerShadowGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.2)');
                    knobCtx.fillStyle = stdKnobInnerShadowGradient;
                }
                knobCtx.beginPath();
                knobCtx.arc(maxPostCenterX, maxPostCenterY, size * 0.77 / 2.0, 0, Math.PI * 2, true);
                knobCtx.closePath();
                knobCtx.fill();
                break;
        }
        knobCtx.restore();

        return knobBuffer;
    };

    var createLedImage = function(size, state, ledColor) {
        var ledBuffer = doc.createElement('canvas');
        ledBuffer.width = size;
        ledBuffer.height = size;
        var ledCtx = ledBuffer.getContext('2d');

        var ledCenterX = size / 2.0;
        var ledCenterY = size / 2.0;

        var ledOffGradient;
        var lightReflex;

        switch (state) {
            case 0: // LED OFF
                // OFF Gradient
                ledCtx.save();
                ledOffGradient = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2.0);
                ledOffGradient.addColorStop(0.0, ledColor.innerColor1_OFF);
                ledOffGradient.addColorStop(0.2, ledColor.innerColor2_OFF);
                ledOffGradient.addColorStop(1.0, ledColor.outerColor_OFF);
                ledCtx.fillStyle = ledOffGradient;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2.0, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // InnerShadow
                ledCtx.save();
                var ledOffInnerShadow = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2.0);
                ledOffInnerShadow.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
                ledOffInnerShadow.addColorStop(0.8, 'rgba(0, 0, 0, 0.0)');
                ledOffInnerShadow.addColorStop(1.0, 'rgba(0, 0, 0, 0.4)');
                ledCtx.fillStyle = ledOffInnerShadow;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2.0, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // LightReflex
                ledCtx.save();
                lightReflex = ledCtx.createLinearGradient(0, 0.35 * size, 0, 0.35 * size + 0.15 * size);
                lightReflex.addColorStop(0.0, 'rgba(255, 255, 255, 0.4)');
                lightReflex.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
                ledCtx.fillStyle = lightReflex;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, 0.35 * size + 0.2 * size / 2.0, size * 0.2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();
                break;

            case 1: // LED ON
                // ON Gradient
                ledCtx.save();
                ledOffGradient = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2.0);
                ledOffGradient.addColorStop(0.0, ledColor.innerColor1_ON);
                ledOffGradient.addColorStop(0.2, ledColor.innerColor2_ON);
                ledOffGradient.addColorStop(1.0, ledColor.outerColor_ON);
                ledCtx.fillStyle = ledOffGradient;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2.0, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // InnerShadow
                ledCtx.save();
                var ledOnInnerShadow = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size * 0.5 / 2.0);
                ledOnInnerShadow.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
                ledOnInnerShadow.addColorStop(0.8, 'rgba(0, 0, 0, 0.0)');
                ledOnInnerShadow.addColorStop(1.0, 'rgba(0, 0, 0, 0.4)');
                ledCtx.fillStyle = ledOnInnerShadow;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size * 0.5 / 2.0, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // LightReflex
                ledCtx.save();
                lightReflex = ledCtx.createLinearGradient(0, 0.35 * size, 0, 0.35 * size + 0.15 * size);
                lightReflex.addColorStop(0.0, 'rgba(255, 255, 255, 0.4)');
                lightReflex.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
                ledCtx.fillStyle = lightReflex;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, 0.35 * size + 0.2 * size / 2.0, size * 0.2, 0, Math.PI * 2, true);
                ledCtx.closePath();
                ledCtx.fill();
                ledCtx.restore();

                // Corona
                ledCtx.save();
                var ledCorona = ledCtx.createRadialGradient(ledCenterX, ledCenterY, 0, ledCenterX, ledCenterY, size / 2.0);
                ledCorona.addColorStop(0.0, setAlpha(ledColor.coronaColor, 0.0).color);
                ledCorona.addColorStop(0.6, setAlpha(ledColor.coronaColor, 0.4).color);
                ledCorona.addColorStop(0.7, setAlpha(ledColor.coronaColor, 0.25).color);
                ledCorona.addColorStop(0.8, setAlpha(ledColor.coronaColor, 0.15).color);
                ledCorona.addColorStop(0.85, setAlpha(ledColor.coronaColor, 0.05).color);
                ledCorona.addColorStop(1.0, setAlpha(ledColor.coronaColor, 0.0).color);
                ledCtx.fillStyle = ledCorona;

                ledCtx.beginPath();
                ledCtx.arc(ledCenterX, ledCenterY, size / 2.0, 0, Math.PI * 2, true);
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
        lcdBackground.addColorStop(0.0, 'rgb(76, 76, 76)');
        lcdBackground.addColorStop(0.08, 'rgb(102, 102, 102)');
        lcdBackground.addColorStop(0.92, 'rgb(102, 102, 102)');
        lcdBackground.addColorStop(1.0, 'rgb(230, 230, 230)');
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
        lcdForeground.addColorStop(0.0, lcdColor.gradientStartColor);
        lcdForeground.addColorStop(0.03, lcdColor.gradientFraction1Color);
        lcdForeground.addColorStop(0.49, lcdColor.gradientFraction2Color);
        lcdForeground.addColorStop(0.5, lcdColor.gradientFraction3Color);
        lcdForeground.addColorStop(1.0, lcdColor.gradientStopColor);
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
            indicatorCtx.lineTo(0.0, 0.0);
            indicatorCtx.lineTo(size, 0.0);
            indicatorCtx.closePath();
            indicatorCtx.fill();
        } else {
            if (vertical) {
                indicatorCtx.beginPath();
                indicatorCtx.moveTo(size, size * 0.5);
                indicatorCtx.lineTo(0.0, 0.0);
                indicatorCtx.lineTo(0.0, size);
                indicatorCtx.closePath();
                indicatorCtx.fill();
            } else {
                indicatorCtx.beginPath();
                indicatorCtx.moveTo(size * 0.5, 0.0);
                indicatorCtx.lineTo(size, size);
                indicatorCtx.lineTo(0.0, size);
                indicatorCtx.closePath();
                indicatorCtx.fill();
            }
        }
        indicatorCtx.restore();

        return indicatorBuffer;
    };

    var drawTitleImage = function(ctx, imageWidth, imageHeight, titleString, unitString, backgroundColor, vertical, radial, altPos) {
        var unitWidth = ctx.measureText(unitString).width;
        var baseSize = imageWidth;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = backgroundColor.labelColor.getRgbaColor();
        ctx.fillStyle = backgroundColor.labelColor.getRgbaColor();
        if (!radial && !vertical) {
            baseSize = imageHeight;
        }

        if (radial) {
            ctx.font = 0.04672897196261682 * imageWidth + 'px sans-serif';
            var titleWidth = ctx.measureText(titleString).width;
            ctx.fillText(titleString, (imageWidth - titleWidth) / 2.0, imageHeight * 0.3, imageWidth * 0.3);
            ctx.fillText(unitString, (imageWidth - unitWidth) / 2.0, imageHeight * 0.38, imageWidth * 0.2);
        } else {
            if (vertical) {
                ctx.font = 0.1 * imageWidth + 'px sans-serif';

                ctx.save();
                ctx.translate(0.6714285714285714 * imageWidth, 0.1375 * imageHeight);
                ctx.rotate(1.5707963267948966);
                ctx.fillText(titleString, 0, 0);
                ctx.translate(-0.6714285714285714 * imageWidth, -0.1375 * imageHeight);
                ctx.restore();

                ctx.font = 0.07142857142857142 * imageWidth + 'px sans-serif';
                if (altPos) {
                    ctx.fillText(unitString, 0.63 * imageWidth, imageHeight * 0.85, imageWidth * 0.2);
                } else {
                    ctx.fillText(unitString, (imageWidth - unitWidth) / 2, imageHeight * 0.89, imageWidth * 0.2);
                }
            } else {
                //var titleWidth = ctx.measureText(titleString).width;
                ctx.font = 0.1 * imageHeight + 'px sans-serif';
                ctx.fillText(titleString, (imageWidth * 0.15), imageHeight * 0.25, imageWidth * 0.3);
                //var unitWidth = ctx.measureText(unitString).width;
//                ctx.font = 0.025 * imageWidth + 'px sans-serif';
                ctx.font = 0.03 * imageWidth + 'px sans-serif';
//                ctx.fillText(unitString, (imageWidth * 0.0625), imageHeight * 0.7, imageWidth * 0.2);
                ctx.fillText(unitString, (imageWidth * 0.0625), imageHeight * 0.7, imageWidth * 0.07);
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

            var RULB_GRADIENT = ctx.createLinearGradient((0.25 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.25 + 3.061616997868383E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.5) * imageHeight + offsetY * imageHeight));
            RULB_GRADIENT.addColorStop(0.0, 'rgba(35, 35, 35, 1.0)');
            RULB_GRADIENT.addColorStop(1.0, 'rgba(23, 23, 23, 1.0)');
            ctx.fillStyle = RULB_GRADIENT;
            ctx.fill();

            // RULF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.08333333333333333, 0, imageWidth * 0.3333333333333333, imageHeight * 0.4166666666666667);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.08333333333333333;
            offsetY = 0.0;
            var RULF_GRADIENT = ctx.createLinearGradient((0.16666666666666666 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.16666666666666666 + 2.5513474982236526E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.4166666666666667) * imageHeight + offsetY * imageHeight));
            RULF_GRADIENT.addColorStop(0.0, 'rgba(38, 38, 38, 1.0)');
            RULF_GRADIENT.addColorStop(1.0, 'rgba(30, 30, 30, 1.0)');
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
            var RLRB_GRADIENT = ctx.createLinearGradient((0.25 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.25 + 3.061616997868383E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.5) * imageHeight + offsetY * imageHeight));
            RLRB_GRADIENT.addColorStop(0.0, 'rgba(35, 35, 35, 1.0)');
            RLRB_GRADIENT.addColorStop(1.0, 'rgba(23, 23, 23, 1.0)');
            ctx.fillStyle = RLRB_GRADIENT;
            ctx.fill();

            // RLRF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.5833333333333334, imageHeight * 0.5, imageWidth * 0.3333333333333333, imageHeight * 0.4166666666666667);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.5833333333333334;
            offsetY = 0.5;
            var RLRF_GRADIENT = ctx.createLinearGradient((0.16666666666666666 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.16666666666666666 + 2.5513474982236526E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.4166666666666667) * imageHeight + offsetY * imageHeight));
            RLRF_GRADIENT.addColorStop(0.0, 'rgba(38, 38, 38, 1.0)');
            RLRF_GRADIENT.addColorStop(1.0, 'rgba(30, 30, 30, 1.0)');
            ctx.fillStyle = RLRF_GRADIENT;
            ctx.fill();

            // RURB
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.5, 0, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.5;
            offsetY = 0.0;
            var RURB_GRADIENT = ctx.createLinearGradient((0.25 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.25 + 3.061616997868383E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.5) * imageHeight + offsetY * imageHeight));
            RURB_GRADIENT.addColorStop(0.0, 'rgba(48, 48, 48, 1.0)');
            RURB_GRADIENT.addColorStop(1.0, 'rgba(40, 40, 40, 1.0)');
            ctx.fillStyle = RURB_GRADIENT;
            ctx.fill();

            // RURF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.5833333333333334, imageHeight * 0.08333333333333333, imageWidth * 0.3333333333333333, imageHeight * 0.4166666666666667);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.5833333333333334;
            offsetY = 0.08333333333333333;
            var RURF_GRADIENT = ctx.createLinearGradient((0.16666666666666666 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.16666666666666666 + 2.5513474982236526E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.4166666666666667) * imageHeight + offsetY * imageHeight));
            RURF_GRADIENT.addColorStop(0.0, 'rgba(53, 53, 53, 1.0)');
            RURF_GRADIENT.addColorStop(1.0, 'rgba(45, 45, 45, 1.0)');
            ctx.fillStyle = RURF_GRADIENT;
            ctx.fill();

            // RLLB
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, imageHeight * 0.5, imageWidth * 0.5, imageHeight * 0.5);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.0;
            offsetY = 0.5;
            var RLLB_GRADIENT = ctx.createLinearGradient((0.25 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.25 + 3.061616997868383E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.5) * imageHeight + offsetY * imageHeight));
            RLLB_GRADIENT.addColorStop(0.0, 'rgba(48, 48, 48, 1.0)');
            RLLB_GRADIENT.addColorStop(1.0, 'rgba(40, 40, 40, 1.0)');
            ctx.fillStyle = RLLB_GRADIENT;
            ctx.fill();

            // RLLF
            ctx.save();
            ctx.beginPath();
            ctx.rect(imageWidth * 0.08333333333333333, imageHeight * 0.5833333333333334, imageWidth * 0.3333333333333333, imageHeight * 0.4166666666666667);
            ctx.closePath();
            ctx.restore();
            offsetX = 0.08333333333333333;
            offsetY = 0.5833333333333334;
            var RLLF_GRADIENT = ctx.createLinearGradient((0.16666666666666666 * imageWidth + offsetX * imageWidth), (0.0 * imageHeight + offsetY * imageHeight), ((0.16666666666666666 + 2.5513474982236526E-17) * imageWidth + offsetX * imageWidth), ((0.0 + 0.4166666666666667) * imageHeight + offsetY * imageHeight));
            RLLF_GRADIENT.addColorStop(0.0, 'rgba(53, 53, 53, 1.0)');
            RLLF_GRADIENT.addColorStop(1.0, 'rgba(45, 45, 45, 1.0)');
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
        ctx.moveTo(0, imageHeight * 0.26666666666666666);
        ctx.bezierCurveTo(0, imageHeight * 0.4, imageWidth * 0.06666666666666667, imageHeight * 0.4666666666666667, imageWidth * 0.2, imageHeight * 0.4666666666666667);
        ctx.bezierCurveTo(imageWidth * 0.3333333333333333, imageHeight * 0.4666666666666667, imageWidth * 0.4, imageHeight * 0.4, imageWidth * 0.4, imageHeight * 0.26666666666666666);
        ctx.bezierCurveTo(imageWidth * 0.4, imageHeight * 0.13333333333333333, imageWidth * 0.3333333333333333, imageHeight * 0.06666666666666667, imageWidth * 0.2, imageHeight * 0.06666666666666667);
        ctx.bezierCurveTo(imageWidth * 0.06666666666666667, imageHeight * 0.06666666666666667, 0, imageHeight * 0.13333333333333333, 0, imageHeight * 0.26666666666666666);
        ctx.closePath();
        var ULB_GRADIENT = ctx.createLinearGradient((0.2 * imageWidth), (0.06666666666666667 * imageHeight), (0.2 * imageWidth), (0.46666666666666667 * imageHeight));
        ULB_GRADIENT.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
        ULB_GRADIENT.addColorStop(1.0, 'rgba(68, 68, 68, 1.0)');
        ctx.fillStyle = ULB_GRADIENT;
        ctx.fill();

        // ULF
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, imageHeight * 0.2);
        ctx.bezierCurveTo(0, imageHeight * 0.3333333333333333, imageWidth * 0.06666666666666667, imageHeight * 0.4, imageWidth * 0.2, imageHeight * 0.4);
        ctx.bezierCurveTo(imageWidth * 0.3333333333333333, imageHeight * 0.4, imageWidth * 0.4, imageHeight * 0.3333333333333333, imageWidth * 0.4, imageHeight * 0.2);
        ctx.bezierCurveTo(imageWidth * 0.4, imageHeight * 0.06666666666666667, imageWidth * 0.3333333333333333, 0, imageWidth * 0.2, imageHeight * 0.0);
        ctx.bezierCurveTo(imageWidth * 0.06666666666666667, 0, 0, imageHeight * 0.06666666666666667, 0, imageHeight * 0.2);
        ctx.closePath();
        var fillColor_ULF = '#050506';
        ctx.fillStyle = fillColor_ULF;
        ctx.fill();

        // LRB
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.4666666666666667, imageHeight * 0.7333333333333333);
        ctx.bezierCurveTo(imageWidth * 0.4666666666666667, imageHeight * 0.8666666666666667, imageWidth * 0.5333333333333333, imageHeight * 0.9333333333333333, imageWidth * 0.6666666666666666, imageHeight * 0.9333333333333333);
        ctx.bezierCurveTo(imageWidth * 0.8, imageHeight * 0.9333333333333333, imageWidth * 0.8666666666666667, imageHeight * 0.8666666666666667, imageWidth * 0.8666666666666667, imageHeight * 0.7333333333333333);
        ctx.bezierCurveTo(imageWidth * 0.8666666666666667, imageHeight * 0.6, imageWidth * 0.8, imageHeight * 0.5333333333333333, imageWidth * 0.6666666666666666, imageHeight * 0.5333333333333333);
        ctx.bezierCurveTo(imageWidth * 0.5333333333333333, imageHeight * 0.5333333333333333, imageWidth * 0.4666666666666667, imageHeight * 0.6, imageWidth * 0.4666666666666667, imageHeight * 0.7333333333333333);
        ctx.closePath();
        var LRB_GRADIENT = ctx.createLinearGradient((0.6666666666666666 * imageWidth), (0.5333333333333333 * imageHeight), (0.6666666666666666 * imageWidth), (0.9333333333333333 * imageHeight));
        LRB_GRADIENT.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');
        LRB_GRADIENT.addColorStop(1.0, 'rgba(68, 68, 68, 1.0)');
        ctx.fillStyle = LRB_GRADIENT;
        ctx.fill();

        // LRF
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageWidth * 0.4666666666666667, imageHeight * 0.6666666666666666);
        ctx.bezierCurveTo(imageWidth * 0.4666666666666667, imageHeight * 0.8, imageWidth * 0.5333333333333333, imageHeight * 0.8666666666666667, imageWidth * 0.6666666666666666, imageHeight * 0.8666666666666667);
        ctx.bezierCurveTo(imageWidth * 0.8, imageHeight * 0.8666666666666667, imageWidth * 0.8666666666666667, imageHeight * 0.8, imageWidth * 0.8666666666666667, imageHeight * 0.6666666666666666);
        ctx.bezierCurveTo(imageWidth * 0.8666666666666667, imageHeight * 0.5333333333333333, imageWidth * 0.8, imageHeight * 0.4666666666666667, imageWidth * 0.6666666666666666, imageHeight * 0.4666666666666667);
        ctx.bezierCurveTo(imageWidth * 0.5333333333333333, imageHeight * 0.4666666666666667, imageWidth * 0.4666666666666667, imageHeight * 0.5333333333333333, imageWidth * 0.4666666666666667, imageHeight * 0.6666666666666666);
        ctx.closePath();
        var fillColor_LRF = '#050506';
        ctx.fillStyle = fillColor_LRF;
        ctx.fill();

        ctx.restore();
    });

    //********************************************   T O O L S   *******************************************************
    var rgbaColor = function(r, g, b, a) {
        var red;
        var green;
        var blue;
        var alpha;

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
            var startAngle;
            var stopAngle;
            var RAD_FACTOR = 180 / Math.PI;
            var TWO_PI = 2 * Math.PI;
            var angleStep = (TWO_PI) / 720;
            var range;
            var startColor;
            var stopColor;

            ctx.save();
            ctx.lineWidth = 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(rotationOffset);

            for (var i = 0, size = fractions.length - 1; i < size; i++) {
                startAngle = TWO_PI * fractions[i];
                stopAngle = TWO_PI * fractions[i + 1];
                range = (stopAngle - startAngle) * RAD_FACTOR;
                startColor = colors[i];
                stopColor = colors[i + 1];
                for (var angle = startAngle; angle < stopAngle; angle += angleStep) {
                    ctx.rotate(angleStep);
                    ctx.strokeStyle = getColorFromFraction(startColor, stopColor, range, (angle - startAngle) * RAD_FACTOR).getRgbaColor();
                    ctx.beginPath();
                    ctx.moveTo(innerX, 0);
                    ctx.lineTo(outerX, 0);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
            ctx.restore();
        };
    };

    var gradientWrapper = function(startX, startY, endX, endY, fractions, colors) {

        this.getColorAt = function(fraction) {
            fraction = (fraction < 0 ? 0 : (fraction > 1 ? 1 : fraction));
            var lowerLimit = 0;
            var lowerIndex = 0;
            var upperLimit = 1;
            var upperIndex = 1;
            var index = 0;
            var i;

            for (i = 0; i < fractions.length; i++) {
                if (fraction[i] < fraction) {
                    lowerLimit = fraction[i];
                    lowerIndex = i;
                }
                if (fraction[i] == fraction) {
                    return colors[i];
                }
                if (fraction[i] > fraction) {
                    upperLimit = fraction[i];
                    upperIndex = i;
                }
            }
            var interpolationFraction = (fraction - lowerLimit) / (upperLimit - lowerLimit);
            return getColorFromFraction(colors[lowerIndex], colors[upperIndex], 1, interpolationFraction);
        };

        this.paintContext = function(ctx, value) {

        };
    };

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
        //ctx.stroke();
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

    function rgb2Hsl(red, green, blue) {
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

    function hsl2Rgb(hue, saturation, lightness){
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

    function hsb2Hsl(hue, saturation, brightness) {
        var lightness = (brightness - saturation) / 2;
        lightness = (lightness > 1 ? 1 : (lightness < 0 ? 0 : lightness));
        return [hue, saturation, lightness];
    }

    function hsl2Hsb(hue, saturation, lightness) {
        var brightness = (lightness * 2) + saturation;
        return [hue, saturation, brightness];
    }

    function hsb2Rgb(hue, saturation, brightness) {
        var tmp = hsb2Hsl(hue, saturation, brightness);
        return hsl2Rgb(tmp[0], tmp[1], tmp[2]);
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

    //****************************************   C O N S T A N T S   ***************************************************
    var backgroundColorDef;
    (function() {
        backgroundColorDef = function(gradientStart, gradientFraction, gradientStop, labelColor, symbolColor) {
            this.gradientStart = gradientStop;
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

    //*************************   I m p l e m e n t a t i o n s   o f   d e f i n i t i o n s   ************************
    var backgroundColor = {
        DARK_GRAY: new backgroundColorDef(new rgbaColor(0,0,0, 1.0), new rgbaColor(51, 51, 51, 1.0), new rgbaColor(153, 153, 153, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(180, 180, 180, 1.0)),
        SATIN_GRAY: new backgroundColorDef(new rgbaColor(45, 57, 57, 1.0), new rgbaColor(45, 57, 57, 1.0), new rgbaColor(45, 57, 57, 1.0), new rgbaColor(167, 184, 180, 1.0), new rgbaColor(137, 154, 150, 1.0)),
        LIGHT_GRAY: new backgroundColorDef(new rgbaColor(130, 130, 130, 1.0), new rgbaColor(181, 181, 181, 1.0), new rgbaColor(253, 253, 253, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(80, 80, 80, 1.0)),
        WHITE: new backgroundColorDef(new rgbaColor(255, 255, 255, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(80, 80, 80, 1.0)),
        BLACK: new backgroundColorDef(new rgbaColor(0, 0, 0, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(150, 150, 150, 1.0)),
        BEIGE: new backgroundColorDef(new rgbaColor(178, 172, 150, 1.0), new rgbaColor(204, 205, 184, 1.0), new rgbaColor(231, 231, 214, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(80, 80, 80, 1.0)),
        BROWN: new backgroundColorDef(new rgbaColor(245, 225, 193, 1.0), new rgbaColor(245, 225, 193, 1.0), new rgbaColor(255, 250, 240, 1.0), new rgbaColor(109, 73, 47, 1.0), new rgbaColor(89, 53, 27, 1.0)),
        RED: new backgroundColorDef(new rgbaColor(198, 93, 95, 1.0), new rgbaColor(212, 132, 134, 1.0), new rgbaColor(242, 218, 218, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(90, 0, 0, 1.0)),
        GREEN: new backgroundColorDef(new rgbaColor(65, 120, 40, 1.0), new rgbaColor(129, 171, 95, 1.0), new rgbaColor(218, 237, 202, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(0, 90, 0, 1.0)),
        BLUE: new backgroundColorDef(new rgbaColor(45, 83, 122, 1.0), new rgbaColor(115, 144, 170, 1.0), new rgbaColor(227, 234, 238, 1.0), new rgbaColor(0, 0, 0, 1.0), new rgbaColor(0, 0, 90, 1.0)),
        ANTHRACITE: new backgroundColorDef(new rgbaColor(50, 50, 54, 1.0), new rgbaColor(47, 47, 51, 1.0), new rgbaColor(69, 69, 74, 1.0), new rgbaColor(250, 250, 250, 1.0), new rgbaColor(180, 180, 180, 1.0)),
        MUD: new backgroundColorDef(new rgbaColor(80, 86, 82, 1.0), new rgbaColor(70, 76, 72, 1.0), new rgbaColor(57, 62, 58, 1.0), new rgbaColor(255, 255, 240, 1.0), new rgbaColor(225, 225, 210, 1.0)),
        PUNCHED_SHEET: new backgroundColorDef(new rgbaColor(50, 50, 54, 1.0), new rgbaColor(47, 47, 51, 1.0), new rgbaColor(69, 69, 74, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(180, 180, 180, 1.0)),
        CARBON: new backgroundColorDef(new rgbaColor(50, 50, 54, 1.0), new rgbaColor(47, 47, 51, 1.0), new rgbaColor(69, 69, 74, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(180, 180, 180, 1.0))
    };

    var lcdColor = {
        BEIGE: new lcdColorDef('rgb(200, 200, 177)', 'rgb(241, 237, 207)', 'rgb(234, 230, 194)', 'rgb(225, 220, 183)', 'rgb(237, 232, 191)', 'rgb(0,0,0)'),
        BLUE: new lcdColorDef('rgb(255, 255, 255)', 'rgb(231, 246, 255)', 'rgb(170, 224, 255)', 'rgb(136, 212, 255)', 'rgb(192, 232, 255)', '#124564'),
        ORANGE: new lcdColorDef('rgb(255, 255, 255)', 'rgb(255, 245, 225)', 'rgb(255, 217, 147)', 'rgb(255, 201, 104)', 'rgb(255, 227, 173)', '#503700'),
        RED: new lcdColorDef('rgb(255, 255, 255)', 'rgb(255, 225, 225)', 'rgb(253, 152, 152)', 'rgb(252, 114, 115)', 'rgb(254, 178, 178)', '#4f0c0e'),
        YELLOW: new lcdColorDef('rgb(255, 255, 255)', 'rgb(245, 255, 186)', 'rgb(210, 255, 0)', 'rgb(158, 205, 0)', 'rgb(210, 255, 0)', '#405300'),
        WHITE: new lcdColorDef('rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgb(241, 246, 242)', 'rgb(229, 239, 244)', 'rgb(255, 255, 255)', 'rgb(0,0,0)'),
        GRAY: new lcdColorDef('rgb(65, 65, 65)', 'rgb(117, 117, 117)', 'rgb(87, 87, 87)', 'rgb(65, 65, 65)', 'rgb(81, 81, 81)', 'rgb(255, 255, 255)'),
        BLACK: new lcdColorDef('rgb(65, 65, 65)', 'rgb(102, 102, 102)', 'rgb(51, 51, 51)', 'rgb(0, 0, 0)', 'rgb(51, 51, 51)', '#cccccc'),
        GREEN: new lcdColorDef('rgb(33, 67, 67)', 'rgb(33, 67, 67)', 'rgb(29, 58, 58)', 'rgb(28, 57, 57)', 'rgb(23, 46, 46)', 'rgba(0, 185, 165, 255)'),
        BLUE2: new lcdColorDef('rgb(0, 68, 103)', 'rgb(8, 109, 165)', 'rgb(0, 72, 117)', 'rgb(0, 72, 117)', 'rgb(0, 68, 103)', 'rgb(111, 182, 228)'),
        BLUE_BLACK: new lcdColorDef('rgb(22, 125, 212)', 'rgb(3, 162, 254)', 'rgb(3, 162, 254)', 'rgb(3, 162, 254)', 'rgb(11, 172, 244)', 'rgb(0,0,0)'),
        BLUE_DARKBLUE: new lcdColorDef('rgb(18, 33, 88)', 'rgb(18, 33, 88)', 'rgb(19, 30, 90)', 'rgb(17, 31, 94)', 'rgb(21, 25, 90)', 'rgb(23, 99, 221)'),
        BLUE_GRAY: new lcdColorDef('rgb(135, 174, 255)', 'rgb(101, 159, 255)', 'rgb(44, 93, 255)', 'rgb(27, 65, 254)', 'rgb(12, 50, 255)', '#b2b4ed'),
        STANDARD: new lcdColorDef('rgb(131, 133, 119)', 'rgb(176, 183, 167)', 'rgb(165, 174, 153)', 'rgb(166, 175, 156)', 'rgb(175, 184, 165)', 'rgb(35, 42, 52)'),
        STANDARD_GREEN: new lcdColorDef('rgb(255, 255, 255)', 'rgb(219, 230, 220)', 'rgb(179, 194, 178)', 'rgb(153, 176, 151)', 'rgb(114, 138, 109)', '#080C06'),
        BLUE_BLUE: new lcdColorDef('rgb(100, 168, 253)', 'rgb(100, 168, 253)', 'rgb(95, 160, 250)', 'rgb(80, 144, 252)', 'rgb(74, 134, 255)', '#002cbb'),
        RED_DARKRED: new lcdColorDef('rgb(72, 36, 50)', 'rgb(185, 111, 110)', 'rgb(148, 66, 72)', 'rgb(83, 19, 20)', 'rgb(7, 6, 14)', '#FE8B92'),
        DARKBLUE: new lcdColorDef('rgb(14, 24, 31)', 'rgb(46, 105, 144)', 'rgb(19, 64, 96)', 'rgb(6, 20, 29)', 'rgb(8, 9, 10)', '#3DB3FF'),
        LILA: new lcdColorDef('rgb(175, 164, 255)', 'rgb(188, 168, 253)', 'rgb(176, 159, 255)', 'rgb(174, 147, 252)', 'rgb(168, 136, 233)', '#076148'),
        BLACKRED: new lcdColorDef('rgb(8, 12, 11)', 'rgb(10, 11, 13)', 'rgb(11, 10, 15)', 'rgb(7, 13, 9)', 'rgb(9, 13, 14)', '#B50026'),
        DARKGREEN: new lcdColorDef('rgb(25, 85, 0)', 'rgb(47, 154, 0)', 'rgb(30, 101, 0)', 'rgb(30, 101, 0)', 'rgb(25, 85, 0)', '#233123')
    };

    var color = {
        RED: new colorDef(new rgbaColor(82, 0, 0, 1.0), new rgbaColor(158, 0, 19, 1.0), new rgbaColor(213, 0, 25, 1.0), new rgbaColor(240, 82, 88, 1.0), new rgbaColor(255, 171, 173, 1.0), new rgbaColor(255, 217, 218, 1.0)),
        GREEN: new colorDef(new rgbaColor(8, 54, 4, 1.0), new rgbaColor(0, 107, 14, 1.0), new rgbaColor(15, 148, 0, 1.0), new rgbaColor(121, 186, 37, 1.0), new rgbaColor(190, 231, 141, 1.0), new rgbaColor(234, 247, 218, 1.0)),
        BLUE: new colorDef(new rgbaColor(0, 11, 68, 1.0), new rgbaColor(0, 73, 135, 1.0), new rgbaColor(0, 108, 201, 1.0), new rgbaColor(0, 141, 242, 1.0), new rgbaColor(122, 200, 255, 1.0), new rgbaColor(204, 236, 255, 1.0)),
        ORANGE: new colorDef(new rgbaColor(118, 83, 30, 1.0), new rgbaColor(215, 67, 0, 1.0), new rgbaColor(240, 117, 0, 1.0), new rgbaColor(255, 166, 0, 1.0), new rgbaColor(255, 255, 128, 1.0), new rgbaColor(255, 247, 194, 1.0)),
        YELLOW: new colorDef(new rgbaColor(41, 41, 0, 1.0), new rgbaColor(102, 102, 0, 1.0), new rgbaColor(177, 165, 0, 1.0), new rgbaColor(255, 242, 0, 1.0), new rgbaColor(255, 250, 153, 1.0), new rgbaColor(255, 252, 204, 1.0)),
        CYAN: new colorDef(new rgbaColor(15, 109, 109, 1.0), new rgbaColor(0, 109, 144, 1.0), new rgbaColor(0, 144, 191, 1.0), new rgbaColor(0, 174, 239, 1.0), new rgbaColor(153, 223, 249, 1.0), new rgbaColor(204, 239, 252, 1.0)),
        MAGENTA: new colorDef(new rgbaColor(98, 0, 114, 1.0), new rgbaColor(128, 24, 72, 1.0), new rgbaColor(191, 36, 107, 1.0), new rgbaColor(255, 48, 143, 1.0), new rgbaColor(255, 172, 210, 1.0), new rgbaColor(255, 214, 23, 1.0)),
        WHITE: new colorDef(new rgbaColor(210, 210, 210, 1.0), new rgbaColor(220, 220, 220, 1.0), new rgbaColor(235, 235, 235, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(255, 255, 255, 1.0), new rgbaColor(255, 255, 255, 1.0)),
        GRAY: new colorDef(new rgbaColor(25, 25, 25, 1.0), new rgbaColor(51, 51, 51, 1.0), new rgbaColor(76, 76, 76, 1.0), new rgbaColor(128, 128, 128, 1.0), new rgbaColor(204, 204, 204, 1.0), new rgbaColor(243, 243, 243, 1.0)),
        BLACK: new colorDef(new rgbaColor(0, 0, 0, 1.0), new rgbaColor(5, 5, 5, 1.0), new rgbaColor(10, 10, 10, 1.0), new rgbaColor(15, 15, 15, 1.0), new rgbaColor(20, 20, 20, 1.0), new rgbaColor(25, 25, 25, 1.0)),
        RAITH: new colorDef(new rgbaColor(0, 32, 65, 1.0), new rgbaColor(0, 65, 125, 1.0), new rgbaColor(0, 106, 172, 1.0), new rgbaColor(130, 180, 214, 1.0), new rgbaColor(148, 203, 242, 1.0), new rgbaColor(191, 229, 255, 1.0)),
        GREEN_LCD: new colorDef(new rgbaColor(0, 55, 45, 1.0), new rgbaColor(15, 109, 93, 1.0), new rgbaColor(0, 185, 165, 1.0), new rgbaColor(48, 255, 204, 1.0), new rgbaColor(153, 255, 227, 1.0), new rgbaColor(204, 255, 241, 1.0)),
        JUG_GREEN: new colorDef(new rgbaColor(0, 56, 0, 1.0), new rgbaColor(32, 69, 36, 1.0), new rgbaColor(50, 161, 0, 1.0), new rgbaColor(129, 206, 0, 1.0), new rgbaColor(190, 231, 141, 1.0), new rgbaColor(234, 247, 218, 1.0))
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
        TILTED_BLACK: new frameDesignDef('tiltedBlack')
//        GLOSSY_METAL: new frameDesignDef('glossyMetal')
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
        TYPE13: new pointerTypeDef('type13')
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

        // Images
        drawFrame : drawRadialFrameImage,
        drawBackground : drawRadialBackgroundImage,
        drawForeground : drawRadialForegroundImage,

        // Tools
        rgbaColor :  rgbaColor,
        conicalGradient : conicalGradient,
        setAlpha : setAlpha,
        getColorFromFraction : getColorFromFraction,

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

        // Other
        Section : section
    };
}();

/**
 * ImageCropWidget component.
 * @module components/manage/Widgets/ImageCropWidget
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import PropTypes from 'prop-types';
import { Input, Button } from 'semantic-ui-react';
import deleteSVG from '@plone/volto/icons/delete.svg';
import { Icon, FormFieldWrapper } from '@plone/volto/components';

// Setting a high pixel ratio avoids blurriness in the canvas crop preview.
const pixelRatio = 4;

// We resize the canvas down when saving on retina devices otherwise the image
// will be double or triple the preview size.
function getResizedCanvas(canvas, newWidth, newHeight) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = newWidth;
  tmpCanvas.height = newHeight;

  const ctx = tmpCanvas.getContext('2d');
  ctx.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    newWidth,
    newHeight,
  );

  return tmpCanvas;
}

async function generateDownload(previewCanvas, crop, id, onChange, fileName) {
  if (!crop || !previewCanvas) {
    return;
  }

  const canvas = getResizedCanvas(previewCanvas, crop.width, crop.height);

  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      1,
    );
  }).then((croppedImage) => {
    const reader = new FileReader();
    reader.onload = function () {
      const fields = reader.result.split(',');
      const otherFields = fields[0].split(';');
      onChange(id, {
        data: fields[1],
        encoding: otherFields[1],
        'content-type': otherFields[0].split(':')[1],
        filename: fileName,
      });
    };
    reader.readAsDataURL(croppedImage);
  });
}
/**
 * ImageCropWidget component class.
 * @function ImageCropWidget
 * @returns {string} Markup of the component.
 */
const ImageCropWidget = ({
  id,
  title,
  required,
  description,
  error,
  value,
  onChange,
  fieldSet,
  wrapped,
}) => {
  const fileInput = React.useRef(null);
  const [upImg, setUpImg] = useState();
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [crop, setCrop] = useState({ unit: '%', width: 30, aspect: 16 / 9 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [fileName, setFilename] = useState(null);

  const onLoad = useCallback((img) => {
    imgRef.current = img;
  }, []);

  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height,
    );
    generateDownload(
      previewCanvasRef.current,
      completedCrop,
      id,
      onChange,
      fileName,
    );
  }, [completedCrop, id, onChange, fileName]);

  return (
    <FormFieldWrapper
      id={id}
      title={title}
      description={description}
      required={required}
      error={error}
      wrapped={wrapped}
      fieldSet={fieldSet}
    >
      <div>
        <canvas
          ref={previewCanvasRef}
          style={{
            width: completedCrop?.width ?? 0,
            height: completedCrop?.height ?? 0,
          }}
          className="image-preview"
        />
      </div>
      <ReactCrop
        src={upImg}
        onImageLoaded={onLoad}
        crop={crop}
        onChange={(c) => setCrop(c)}
        onComplete={(c) => setCompletedCrop(c)}
      />

      <Input
        id={`field-${id}`}
        name={id}
        type="file"
        ref={fileInput}
        onChange={({ target }) => {
          const file = target.files[0];
          setFilename(file.name);
          let reader = new FileReader();
          reader.onload = function () {
            setUpImg(reader.result);
          };
          reader.readAsDataURL(target.files[0]);
        }}
      />
      <div className="field-file-name">
        {value && value.filename}
        {value && (
          <Button
            icon
            basic
            className="delete-button"
            aria-label="delete file"
            onClick={() => {
              onChange(id, null);
              fileInput.current.inputRef.value = null;
            }}
          >
            <Icon name={deleteSVG} size="20px" />
          </Button>
        )}
      </div>
    </FormFieldWrapper>
  );
};

/**
 * Property types.
 * @property {Object} propTypes Property types.
 * @static
 */
ImageCropWidget.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.arrayOf(PropTypes.string),
  value: PropTypes.shape({
    '@type': PropTypes.string,
    title: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  wrapped: PropTypes.bool,
};

/**
 * Default properties.
 * @property {Object} defaultProps Default properties.
 * @static
 */
ImageCropWidget.defaultProps = {
  description: null,
  required: false,
  error: [],
  value: null,
};

export default ImageCropWidget;
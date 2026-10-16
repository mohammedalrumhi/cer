import { createElement, isTextElement } from '../model/elements';
import { insertElements } from '../actions';
import { toast } from '../../ui/toast';

/** Top-most element whose bounds contain a document point. */
export function elementAt(store, point, predicate = () => true) {
  const { document, boxes } = store.getState();
  for (let i = document.elements.length - 1; i >= 0; i -= 1) {
    const element = document.elements[i];
    const box = boxes.get(element.id);
    if (!box || element.visible === false || element.locked || !predicate(element)) continue;
    if (point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height) return element;
  }
  return null;
}

/** A field on a text inserts {{field}}; on empty space it creates a bound text. */
export function dropField(store, field, point) {
  const target = point ? elementAt(store, point, isTextElement) : null;
  const token = `{{${field.key}}}`;
  if (target) {
    const state = store.getState();
    if (target.type === 'text') {
      state.updateElement(target.id, { text: `${target.text || ''}${target.text ? ' ' : ''}${token}` }, { label: 'إدراج حقل' });
    } else {
      const base = target.dynamicTextTemplate || (target.type === 'dateField' ? '{{value}}' : `{{${target.field || 'studentName'}}}`);
      state.updateElement(target.id, { dynamicTextTemplate: `${base} ${token}` }, { label: 'إدراج حقل' });
    }
    state.select([target.id]);
    toast.success(`أُدرج الحقل «${field.label}» في النص`);
    return;
  }
  insertElements(store, createElement('dynamicText', { field: field.key, width: field.width || 420, fontSize: field.fontSize || 32, fill: '#1b2a23', fontFamily: 'Cairo-Bold' }), point);
}

/** An uploaded image on a frame fills the frame; elsewhere it becomes an image element. */
export function dropAsset(store, asset, point) {
  const frame = point ? elementAt(store, point, (el) => el.type === 'frame') : null;
  if (frame) {
    store.getState().updateElement(frame.id, { src: asset.path, crop: null }, { label: 'تعبئة الإطار' });
    store.getState().select([frame.id]);
    return;
  }
  const max = 420;
  const scale = Math.min(1, max / Math.max(asset.width || max, asset.height || max));
  insertElements(store, createElement('image', {
    src: asset.path,
    name: asset.name,
    width: Math.round((asset.width || 300) * scale),
    height: Math.round((asset.height || 200) * scale),
  }), point);
}

/** Run a panel payload at a point (or the visible centre when point is undefined). */
export function dropPayload(store, payload, point) {
  if (payload.field) return dropField(store, payload.field, point);
  if (payload.asset) return dropAsset(store, payload.asset, point);
  const made = payload.make();
  return insertElements(store, made, point);
}

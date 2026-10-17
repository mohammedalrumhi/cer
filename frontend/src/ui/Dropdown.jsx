import { cloneElement, isValidElement } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronLeft } from 'lucide-react';
import { cx } from './cx';
import { shortcutLabel } from './format';

import { menuContentClass, menuItemClass, menuLabelClass, menuSeparatorClass } from './menuStyles';

export function Dropdown(props) {
  return <Menu.Root {...props} />;
}

export function DropdownTrigger(props) {
  return <Menu.Trigger {...props} />;
}

export function DropdownContent({ children, align = 'end', side = 'bottom', className, ...props }) {
  return (
    <Menu.Portal>
      <Menu.Content align={align} side={side} sideOffset={6} collisionPadding={8} className={cx(menuContentClass, className)} {...props}>
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export function DropdownItem({ icon: Icon, children, shortcut, danger, className, asChild = false, ...props }) {
  const content = (label) => (
    <>
      {Icon && <Icon size={16} aria-hidden className="shrink-0 opacity-80" />}
      <span className="flex-1">{label}</span>
      {shortcut && <kbd dir="ltr" className="font-sans text-[11px] text-fg-subtle">{shortcutLabel(shortcut)}</kbd>}
    </>
  );
  const itemClass = cx(menuItemClass, danger && 'text-danger data-[highlighted]:bg-danger-bg', className);
  // asChild (e.g. a router <Link>): Radix slots onto exactly one element, so the icon and label go inside it.
  if (asChild && isValidElement(children)) {
    return (
      <Menu.Item asChild className={itemClass} {...props}>
        {cloneElement(children, undefined, content(children.props.children))}
      </Menu.Item>
    );
  }
  return (
    <Menu.Item className={itemClass} {...props}>
      {content(children)}
    </Menu.Item>
  );
}

export function DropdownCheckItem({ checked, onCheckedChange, children, shortcut }) {
  return (
    <Menu.CheckboxItem checked={checked} onCheckedChange={onCheckedChange} onSelect={(event) => event.preventDefault()} className={menuItemClass}>
      <span className="grid size-4 place-items-center">
        <Menu.ItemIndicator><Check size={15} className="text-primary" /></Menu.ItemIndicator>
      </span>
      <span className="flex-1">{children}</span>
      {shortcut && <kbd dir="ltr" className="font-sans text-[11px] text-fg-subtle">{shortcutLabel(shortcut)}</kbd>}
    </Menu.CheckboxItem>
  );
}

export function DropdownRadioGroup({ value, onValueChange, options }) {
  return (
    <Menu.RadioGroup value={value} onValueChange={onValueChange}>
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} className={menuItemClass}>
          <span className="grid size-4 place-items-center">
            <Menu.ItemIndicator><Check size={15} className="text-primary" /></Menu.ItemIndicator>
          </span>
          {option.icon && <option.icon size={16} aria-hidden className="opacity-80" />}
          <span className="flex-1">{option.label}</span>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

export function DropdownSub({ label, icon: Icon, children, disabled }) {
  return (
    <Menu.Sub>
      <Menu.SubTrigger className={menuItemClass} disabled={disabled}>
        {Icon && <Icon size={16} aria-hidden className="opacity-80" />}
        <span className="flex-1">{label}</span>
        <ChevronLeft size={15} aria-hidden />
      </Menu.SubTrigger>
      <Menu.Portal>
        <Menu.SubContent sideOffset={4} collisionPadding={8} className={menuContentClass}>{children}</Menu.SubContent>
      </Menu.Portal>
    </Menu.Sub>
  );
}

export function DropdownSeparator() {
  return <Menu.Separator className={menuSeparatorClass} />;
}

export function DropdownLabel({ children }) {
  return <Menu.Label className={menuLabelClass}>{children}</Menu.Label>;
}

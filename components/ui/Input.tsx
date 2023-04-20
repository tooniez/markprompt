import cn from 'classnames';
import { FC, ReactNode, useMemo } from 'react';

export const NoAutoInput = (props: any) => {
  return (
    <Input
      {...props}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
    />
  );
};

type InputWrapperProps = {
  inputSize?: 'sm' | 'base' | 'md' | 'lg';
  variant?: 'plain' | 'glow';
  children?: ReactNode;
  className?: string;
  rightLabel?: string;
} & any;

const InputWrapper: FC<InputWrapperProps> = ({
  children,
  className,
  rightLabel,
}) => {
  if (rightLabel) {
    return (
      <div
        className={cn(className, 'input-wrapper', 'flex flex-row items-center')}
      >
        <div className="flex-grow">{children}</div>
        <div className="flex-none whitespace-nowrap px-2 text-sm text-neutral-500">
          {rightLabel}
        </div>
      </div>
    );
  }

  return children;
};

type InputProps = {
  inputSize?: 'sm' | 'base' | 'md' | 'lg';
  variant?: 'plain' | 'glow';
  children?: ReactNode;
  className?: string;
  wrapperClassName?: string;
  rightLabel?: string;
} & any;

const Input: FC<InputProps> = ({
  inputSize: s,
  variant,
  className,
  wrapperClassName,
  rightLabel,
  ...props
}) => {
  const inputSize = s ?? 'base';
  const hasLegend = !!rightLabel;

  return (
    <InputWrapper className={wrapperClassName} rightLabel={rightLabel}>
      <input
        {...props}
        // value={props.value || undefined}
        value={props.value || ''}
        className={cn(className, 'input-base', {
          'input-base-border': !hasLegend,
          'input-base-noborder': hasLegend,
          'w-full flex-grow': hasLegend,
          'px-2 py-2 text-sm': inputSize === 'base',
          'px-2 py-1.5 text-sm': inputSize === 'sm',
          'input-glow-color': variant === 'glow',
        })}
      />
    </InputWrapper>
  );
};

export default Input;

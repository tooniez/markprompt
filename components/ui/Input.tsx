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
  rightAccessory?: string | ReactNode;
} & any;

const InputWrapper: FC<InputWrapperProps> = ({
  children,
  className,
  rightAccessory,
}) => {
  if (rightAccessory) {
    return (
      <div
        className={cn(className, 'input-wrapper', 'flex flex-row items-center')}
      >
        <div className="flex-grow">{children}</div>
        {typeof rightAccessory === 'string' ? (
          <div className="flex-none whitespace-nowrap px-2 text-sm text-neutral-500">
            {rightAccessory}
          </div>
        ) : (
          <>{rightAccessory}</>
        )}
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
  rightAccessory?: string | ReactNode;
} & any;

const Input: FC<InputProps> = ({
  inputSize: s,
  variant,
  className,
  wrapperClassName,
  rightAccessory,
  ...props
}) => {
  const inputSize = s ?? 'base';
  const hasRightAccessory = !!rightAccessory;

  return (
    <InputWrapper className={wrapperClassName} rightAccessory={rightAccessory}>
      <input
        {...props}
        value={props.value || ''}
        className={cn(className, 'input-base', {
          'input-base-border': !hasRightAccessory,
          'input-base-noborder': hasRightAccessory,
          'w-full flex-grow': hasRightAccessory,
          'px-2 py-2 text-sm': inputSize === 'base',
          'px-2 py-1.5 text-sm': inputSize === 'sm',
          'input-glow-color': variant === 'glow',
        })}
      />
    </InputWrapper>
  );
};

export default Input;

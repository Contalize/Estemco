import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, MoreVertical, X, CheckCircle2, ShieldAlert, Mail } from 'lucide-react';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)} {...props}>{children}</div>
));
Card.displayName = 'Card';

export const Label = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <label className={`text-sm font-medium text-slate-700 mb-1.5 block ${className}`}>{children}</label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'default' | 'sm' | 'lg' | 'icon' }>(({ children, variant = 'primary', size = 'default', className = '', ...props }, ref) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-700",
    ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-700"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  };

  return (
    <button ref={ref} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[100] min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

export const Toast = ({ message, variant = 'default', onClose }: { message: string, variant?: 'default' | 'destructive' | 'success', onClose: () => void }) => {
  const variants = {
    default: "bg-white border-slate-200 text-slate-900",
    destructive: "bg-red-50 border-red-200 text-red-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800"
  };
  
  const icons = {
    default: <Mail size={20} className="text-slate-400" />,
    destructive: <ShieldAlert size={20} className="text-red-500" />,
    success: <CheckCircle2 size={20} className="text-emerald-500" />
  };

  return (
    <div className={cn("fixed bottom-4 right-4 border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[100]", variants[variant])}>
      {icons[variant]}
      <div className="flex-1">
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export const Combobox = ({ options, value, onChange, placeholder = "Selecione..." }: { options: {label: string, value: string}[], value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={selectedOption ? "text-slate-900 truncate" : "text-slate-400 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-base shadow-lg sm:text-sm">
          <div className="sticky top-0 bg-white px-2 pb-2 pt-2 z-10">
            <input 
              type="text" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" 
              placeholder="Pesquisar cliente..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="relative cursor-default select-none px-4 py-3 text-slate-500 text-sm text-center">Nenhum resultado encontrado.</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`relative cursor-pointer select-none py-2.5 pl-10 pr-4 hover:bg-slate-100 transition-colors ${value === opt.value ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className={`block truncate ${value === opt.value ? 'font-medium' : 'font-normal'}`}>
                  {opt.label}
                </span>
                {value === opt.value ? (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-900">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

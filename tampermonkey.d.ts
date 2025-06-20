declare function GM_registerMenuCommand(
   name: string,
   onClick: (
       event: MouseEvent | KeyboardEvent,
   ) => void,
   optionsOrAccessKey?: string | {
       id?: number | string;
       accessKey?: string;
       autoClose?: boolean;
       title?: string;
   },
): number;
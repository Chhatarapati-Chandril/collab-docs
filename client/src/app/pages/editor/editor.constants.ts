export const EDITOR_CONSTANTS = {
    defaultTitle: 'Untitled document',
    titlePlaceholder: 'Enter document title',
    titleAriaLabel: 'Document title',
    titleTooltip: 'Click to rename',
    renameErrorLog: 'Failed to rename document',
    accessDeniedMsg: "You don't have access to this document.",
    requestAccessBtn: 'Request Access',
    requestAccessSuccess: 'Access request sent successfully.',
    requestAccessError: 'Failed to request access',
    defaultPdfFilename: 'document',
    pdfSuccess: 'PDF downloaded successfully',
    pdfError: 'Failed to generate PDF',
    pdfMarginPt: [40, 40, 40, 40], // top, right, bottom, left
} as const;

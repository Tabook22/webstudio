export {
  Heading1, Heading2, Heading3, Pilcrow, Quote, Link, RectangleHorizontal, List, ListOrdered,
  ListTree, Table, Image, Video, SquarePlay, Square, Columns2, Columns3, IdCard, Minus, Menu,
  PanelTop, PanelBottom, Mail, Images, TextCursorInput, Text, ChevronDown, SquareCheck,
  MousePointerClick, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Undo2, Redo2, Monitor, Tablet, Smartphone, Eye, ClipboardPaste, Settings, FilePlus,
  FolderOpen, Save, FolderDown, Download, Languages, ZoomIn, Copy, Trash2, ArrowUp, ArrowDown,
  ArrowLeft, ArrowRight, Plus, X, Code, Paintbrush, Info, LayoutTemplate, Globe, Map, Layers,
  Blocks, Columns4, Rows3, Upload, Palette, PanelsTopLeft, CornerLeftUp, MoveVertical,
  Moon, Sun, ScanEye, Pencil, Target, Trophy, Lightbulb, RotateCcw, ChevronLeft, ChevronRight,
  CircleCheckBig, Circle, Rocket, Sparkles, SwatchBook, PaintBucket, Baseline, LayoutGrid, Ellipsis, Check,
} from 'lucide-static';

/** Inline an icon SVG string, sized for UI chrome. */
export function icon(svg: string, size = 18): string {
  return svg.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`);
}

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import JSZip from 'jszip';

import {
  Files,
  Play,
  RotateCcw,
  Terminal,
  Package,
  Code,
  Plus,
  FilePlus,
  Archive,
  Loader,
  Edit,
  LucideIcon,
  Moon,
  Sun,
} from 'lucide-react';

interface SidebarTabProps {
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

interface FileItemProps {
  name: string;
  isActive: boolean;
  isDarkMode: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
}

interface PackageItemProps {
  name: string;
  isDarkMode: boolean;
}

interface NewFileDialogProps {
  onClose: () => void;
  onCreate: (fileName: string) => void;
  existingFiles: string[];
}

interface RenameFileDialogProps {
  onClose: () => void;
  onRename: (oldName: string, newName: string) => void;
  existingFiles: string[];
  currentName: string;
}

declare global {
  interface Window {
    loadPyodide: () => Promise<any>;
    isDragging: boolean;
    isDraggingSidebar: boolean;
    focusEditor?: () => void;
  }
}

const SidebarTab = memo(({ icon: Icon, isActive, onClick }: SidebarTabProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-3 py-1 ${isActive ? 'border-b-2 border-blue-500' : ''}`}
  >
    <Icon size={16} />
  </button>
));

// Update FileItem buttons
const FileItem = memo(({ name, isActive, isDarkMode, onClick, onRename, onDelete }: FileItemProps) => (
  <div
    className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
      isActive 
        ? isDarkMode 
          ? 'bg-gray-800' 
          : 'bg-blue-50'
        : isDarkMode
          ? 'hover:bg-gray-800'
          : 'hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-2">
      <Code size={16} />
      <span className="text-sm">{name}</span>
    </div>
    <div className="flex gap-1">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRename(name);
        }}
        className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded opacity-0 group-hover:opacity-100 transition-opacity`}
        title="Rename File"
      >
        <Edit size={12} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(name);
        }}
        className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded opacity-0 group-hover:opacity-100 transition-opacity text-red-500`}
        title="Delete File"
      >
      </button>
    </div>
  </div>
));

const PackageItem = memo(({ name, isDarkMode }: PackageItemProps) => (
  <div className={`flex items-center gap-2 px-2 py-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded text-sm`}>
    <Package size={14} />
    {name}
  </div>
));

const NewFileDialog = ({ onClose, onCreate, existingFiles }: NewFileDialogProps) => {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);
  const handleCreate = () => {
    if (!fileName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    const finalName = fileName.endsWith('.py') ? fileName : `${fileName}.py`;
    if (existingFiles.includes(finalName)) {
      setError('File already exists');
      return;
    }
    onCreate(finalName);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 p-4 rounded-lg w-80 shadow-xl">
        <h3 className="text-lg mb-4">Create New File</h3>
        <input
          type="text"
          value={fileName}
          onChange={(e) => {
            setFileName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') {
              onClose();
              setTimeout(() => window.focusEditor && window.focusEditor(), 0);
            }
          }}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded mb-2"
          placeholder="filename.py"
          ref={inputRef}
        />
        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={() => { onClose(); setTimeout(() => window.focusEditor && window.focusEditor(), 0); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            Cancel
          </button>
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const RenameFileDialog = ({ onClose, onRename, existingFiles, currentName }: RenameFileDialogProps) => {
  const [fileName, setFileName] = useState(currentName);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);
  const handleRename = () => {
    if (!fileName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    const finalName = fileName.endsWith('.py') ? fileName : `${fileName}.py`;
    if (finalName !== currentName && existingFiles.includes(finalName)) {
      setError('File already exists');
      return;
    }
    onRename(currentName, finalName);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 p-4 rounded-lg w-80 shadow-xl">
        <h3 className="text-lg mb-4">Rename File</h3>
        <input
          type="text"
          value={fileName}
          onChange={(e) => {
            setFileName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') {
              onClose();
              setTimeout(() => window.focusEditor && window.focusEditor(), 0);
            }
          }}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded mb-2"
          placeholder="filename.py"
          ref={inputRef}
        />
        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={() => { onClose(); setTimeout(() => window.focusEditor && window.focusEditor(), 0); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            Cancel
          </button>
          <button onClick={handleRename} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteFileDialog = ({ onClose, onDelete, fileName }: { onClose: () => void; onDelete: () => void; fileName: string }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 p-4 rounded-lg w-80 shadow-xl">
        <h3 className="text-lg mb-4">Delete {fileName}?</h3>
        <p className="text-gray-400 mb-4">Are you sure you want to delete this file? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => { onClose(); setTimeout(() => window.focusEditor && window.focusEditor(), 0); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            Cancel
          </button>
          <button onClick={onDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const CodeEditor = () => {
  const [code, setCode] = useState('# Write your Python code here\nprint("Hello, World!")');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [fileToRename, setFileToRename] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFileName, setDeleteFileName] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pyodide, setPyodide] = useState<any>(null);
  const [packageName, setPackageName] = useState('');
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);
  const [activeTab, setActiveTab] = useState('explorer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': '# Write your Python code here\nprint("Hello, World!")',
  });
  const [activeFile, setActiveFile] = useState('main.py');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const isDraggingSidebarRef = useRef(false);

  useEffect(() => {
    window.focusEditor = () => {
      setTimeout(() => {
        if (editorRef.current) {
          // Force cursor redraw
          const temp = editorRef.current.value;
          editorRef.current.value = '';
          editorRef.current.value = temp;
          editorRef.current.blur();
          editorRef.current.focus();
        }
      }, 10);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          if (editorRef.current) {
            const temp = editorRef.current.value;
            editorRef.current.value = '';
            editorRef.current.value = temp;
            editorRef.current.blur();
            editorRef.current.focus();
          }
        }, 10);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!showNewFileDialog && !showRenameDialog && !showDeleteDialog) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 0);
    }
  }, [showNewFileDialog, showRenameDialog, showDeleteDialog]);

  useEffect(() => {
    async function initPyodide() {
      try {
        const pyodideInstance = await window.loadPyodide();
        setPyodide(pyodideInstance);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load Pyodide');
        setIsLoading(false);
      }
    }
    initPyodide();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const newHeight = window.innerHeight - e.clientY;
        setTerminalHeight(Math.min(Math.max(100, newHeight), window.innerHeight - 200));
      }
      if (isDraggingSidebarRef.current) {
        setSidebarWidth(Math.max(160, Math.min(480, e.clientX)));
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isDraggingSidebarRef.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const target = event.target as FileReader;
        if (target && target.result) {
          setFiles((prev) => ({
            ...prev,
            [file.name]: target.result as string,
          }));
        }
      };
      reader.readAsText(file);
    });
    setTimeout(() => editorRef.current?.focus(), 10);
  }, []);

  function dedent(str: string) {
    const lines = str.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indentLengths = nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match ? match[0].length : 0;
    });
    const minIndent = Math.min(...indentLengths);
    return lines.map((line) => line.substring(minIndent)).join('\n');
  }

  const runCode = async () => {
    if (!pyodide || isRunning) return;
    setIsRunning(true);
    setError('');
    setOutput('Running...');
    try {
      const pythonCodeTemplate = `
        import sys
        import builtins
        from io import StringIO
        from types import ModuleType

        def run_code_safely(code_str):
            module = ModuleType('__main__')
            module.__dict__.update(builtins.__dict__)
            stdout = StringIO()
            stderr = StringIO()
            old_stdout = sys.stdout
            old_stderr = sys.stderr

            def custom_input(prompt=''):
                from js import window
                result = window.prompt(prompt)
                window.focusEditor()  # Immediately refocus editor after prompt, regardless of OK/Cancel
                if ('int' in prompt.lower()) or ('number' in prompt.lower()):
                    try:
                        return int(result) if result is not None else 0
                    except Exception as e:
                        window.alert("Invalid integer input!")
                        raise ValueError("Invalid integer input!")
                return '' if result is None else str(result)

            module.__dict__['input'] = custom_input

            try:
                sys.stdout = stdout
                sys.stderr = stderr
                exec(code_str, module.__dict__)
                return stdout.getvalue(), stderr.getvalue()
            except Exception as e:
                return '', str(e)
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

        output, error = run_code_safely(${JSON.stringify(code)})
      `;
      const pythonCode = dedent(pythonCodeTemplate);
      await pyodide.runPythonAsync(pythonCode);
      const outputResult = pyodide.globals.get('output');
      const errorResult = pyodide.globals.get('error');
      if (errorResult) {
        setError(errorResult);
      } else {
        setOutput(outputResult || 'Code executed successfully');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsRunning(false);
      setTimeout(() => editorRef.current?.focus(), 10);
    }
  };

  const installPackage = async () => {
    if (!packageName.trim() || isInstallingPackage || !pyodide) return;
    setIsInstallingPackage(true);
    setError('');
    try {
      await pyodide.loadPackage(packageName);
      setInstalledPackages((prev) => [...prev, packageName]);
      setOutput(`Successfully installed ${packageName}`);
      setPackageName('');
    } catch (err) {
      setError(`Failed to install ${packageName}`);
    } finally {
      setIsInstallingPackage(false);
      setTimeout(() => editorRef.current?.focus(), 10);
    }
  };

  const handleDeleteFile = (fileName: string) => {
    setShowDeleteDialog(true);
    setDeleteFileName(fileName);
  };

  const handleConfirmDelete = () => {
    setFiles((prevFiles) => {
      const newFiles = { ...prevFiles };
      delete newFiles[deleteFileName];
      return newFiles;
    });
    setShowDeleteDialog(false);
    setActiveFile(Object.keys(files)[0] || '');
    setTimeout(() => editorRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setFiles((prev) => ({ ...prev, [activeFile]: newCode }));
      setTimeout(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      }, 0);
    }
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    Object.entries(files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    const metadata = {
      exportDate: new Date().toISOString(),
      projectName: 'python-project',
      packages: installedPackages,
    };
    zip.file('project-metadata.json', JSON.stringify(metadata, null, 2));
    if (installedPackages.length > 0) {
      const requirements = installedPackages.join('\n');
      zip.file('requirements.txt', requirements);
    }
    const readme = `# Python Project
Created: ${new Date().toLocaleDateString()}

## Files
${Object.keys(files).map((file) => `- ${file}`).join('\n')}

${installedPackages.length > 0 ? `\n## Dependencies
${installedPackages.map((pkg) => `- ${pkg}`).join('\n')}` : ''}

## How to Run
1. Make sure you have Python installed
2. If there are dependencies, install them using:
   \`\`\`
   pip install -r requirements.txt
   \`\`\`
3. Run the main file:
   \`\`\`
   python main.py
   \`\`\`
`;
    zip.file('README.md', readme);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'python-project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => editorRef.current?.focus(), 10);
  };

  return (
    <div className={`h-screen w-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-800'}`}>
      <style>{`
        #editorTextArea {
          caret-color: ${isDarkMode ? '#fff' : '#000'} !important;
          caret-shape: block !important;
        }
        #editorTextArea::selection {
          background: ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} !important;
          color: transparent !important;
        }
        pre[class*="language-"] {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        code[class*="language-"] {
          text-shadow: none !important;
        }
      `}</style>

      <div className={`h-8 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b flex items-center px-4 justify-between`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsSidebarOpen((prev) => !prev);
              setTimeout(() => editorRef.current?.focus(), 10);
            }}
            className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded`}
            title="Toggle Sidebar"
          >
            <Files size={14} />
          </button>
          <span className="text-sm">Python Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadProject}
            className={`flex items-center gap-1 px-3 py-1 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded text-sm`}
          >
            <Archive size={14} />
            Export Project
          </button>
          <button
            onClick={() => {
              setOutput('');
              runCode();
            }}
            disabled={isLoading || !pyodide || isRunning}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 text-white"
          >
            {isRunning ? <Loader className="animate-spin" size={14} /> : <Play size={14} />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <>
            <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col`} style={{ width: sidebarWidth }}>
              <div className={`h-10 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex`}>
                <SidebarTab icon={Files} isActive={activeTab === 'explorer'} onClick={() => setActiveTab('explorer')} />
                <SidebarTab icon={Package} isActive={activeTab === 'packages'} onClick={() => setActiveTab('packages')} />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {activeTab === 'explorer' ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">EXPLORER</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowNewFileDialog(true)}
                          className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded`}
                          title="New File"
                        >
                          <FilePlus size={16} />
                        </button>
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setTimeout(() => editorRef.current?.focus(), 10);
                          }}
                          className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded`}
                          title="Upload File"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    {Object.entries(files).map(([name]) => (
                      <FileItem
                        key={name}
                        name={name}
                        isActive={activeFile === name}
                        isDarkMode={isDarkMode}
                        onClick={() => {
                          setActiveFile(name);
                          setCode(files[name]);
                          editorRef.current?.focus();
                        }}
                        onRename={(name) => {
                          setFileToRename(name);
                          setShowRenameDialog(true);
                        }}
                        onDelete={handleDeleteFile}
                      />
                    ))}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        placeholder="Package name"
                        className={`flex-1 px-2 py-1 ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-300'
                        } rounded text-sm`}
                      />
                      <button
                        onClick={installPackage}
                        disabled={isInstallingPackage || !packageName.trim()}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 flex items-center gap-1 text-white"
                      >
                        {isInstallingPackage ? <Loader className="animate-spin" size={14} /> : <Plus size={14} />}
                        Install
                      </button>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold mb-2">Installed Packages</h3>
                      {installedPackages.length === 0 ? (
                        <div className="text-sm text-gray-500">No packages installed</div>
                      ) : (
                        <div className="space-y-1">
                          {installedPackages.map((pkg) => (
                            <PackageItem key={pkg} name={pkg} isDarkMode={isDarkMode} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div
              className="w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingSidebarRef.current = true;
                isDraggingRef.current = false;
              }}
            />
          </>
        )}

        <div className="flex-1 flex flex-col relative">
          <div className={`flex-1 overflow-hidden relative ${isDarkMode ? 'bg-[#282c34]' : 'bg-white'}`}>
            <div className="absolute inset-0 flex">
              <div className={`h-full ${isDarkMode ? 'bg-[#21252b]' : 'bg-white'} border-r ${isDarkMode ? 'border-[#181a1f]' : 'border-gray-200'} w-[3em] flex-shrink-0 overflow-hidden`}>
                <div
                  className="w-full h-full overflow-hidden flex flex-col items-end will-change-transform"
                  style={{ position: 'relative', transform: 'translate3d(0,0,0)', willChange: 'transform' }}
                >
                  {code.split('\n').map((_, i) => (
                    <div key={i} className={`h-[21px] leading-[21px] px-2 text-sm ${isDarkMode ? 'text-[#495162]' : 'text-gray-400'} select-none whitespace-nowrap`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex-grow overflow-hidden">
                <textarea
                  id="editorTextArea"
                  ref={editorRef}
                  value={code}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setCode(newCode);
                    setFiles((prev) => ({ ...prev, [activeFile]: newCode }));
                  }}
                  onKeyDown={handleKeyDown}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const pre = target.nextElementSibling as HTMLPreElement;
                    const lineNumbers = target.parentElement?.previousElementSibling?.firstElementChild;
                    if (pre) pre.scrollTop = target.scrollTop;
                    if (lineNumbers) lineNumbers.scrollTop = target.scrollTop;
                  }}
                  className="w-full h-full resize-none outline-none absolute inset-0 overflow-auto z-20 will-change-scroll"
                  spellCheck="false"
                  style={{
                    background: 'transparent',
                    color: 'transparent',  // Ensure text is transparent
                    WebkitTextFillColor: 'transparent',  // Ensure text is transparent
                    caretColor: isDarkMode ? '#fff' : '#000',
                    textShadow: 'none',  // Remove text shadow
                    tabSize: 4,
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                    whiteSpace: 'pre',
                    padding: '0 1rem',
                    lineHeight: '21px',
                    fontSize: '14px',
                    WebkitOverflowScrolling: 'touch'
                  }}
                />

                <pre className="absolute inset-0 pointer-events-none z-10 overflow-auto will-change-scroll">
                  <SyntaxHighlighter
                    language="python"
                    style={{
                      ...oneDark,
                      'pre[class*="language-"]': {
                        ...oneDark['pre[class*="language-"]'],
                        margin: 0,
                        background: isDarkMode ? '#282c34' : '#ffffff',
                        padding: 0
                      },
                      'code[class*="language-"]': {
                        ...oneDark['code[class*="language-"]'],
                        fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                        fontSize: '14px',
                        lineHeight: '21px',
                        color: isDarkMode ? '#abb2bf' : '#000000',
                        background: 'transparent',
                        textShadow: 'none'
                      },
                      'token': {
                        background: 'transparent !important',
                        textShadow: 'none !important',
                        border: '0 !important',
                        boxShadow: 'none !important'
                      },
                      // Brighter light mode colors
                      comment: { 
                        color: isDarkMode ? '#5c6370' : '#22863a',  // Brighter green
                        fontStyle: 'italic' 
                      },
                      string: { 
                        color: isDarkMode ? '#98c379' : '#b31d28'  // Brighter red
                      },
                      keyword: { 
                        color: isDarkMode ? '#c678dd' : '#d73a49',  // Brighter purple-red
                        fontWeight: 'bold'
                      },
                      'class-name': { 
                        color: isDarkMode ? '#e5c07b' : '#6f42c1',  // Brighter purple
                        fontWeight: 'bold'
                      },
                      function: { 
                        color: isDarkMode ? '#61afef' : '#005cc5',  // Brighter blue
                        fontWeight: 'bold'
                      },
                      number: { 
                        color: isDarkMode ? '#d19a66' : '#e36209'  // Brighter orange
                      },
                      operator: { 
                        color: isDarkMode ? '#56b6c2' : '#005cc5',  // Brighter blue
                        fontWeight: 'bold'
                      },
                      builtin: { 
                        color: isDarkMode ? '#e06c75' : '#005cc5',  // Brighter blue
                        fontWeight: 'bold'
                      },
                      variable: { 
                        color: isDarkMode ? '#abb2bf' : '#24292e',  // Dark gray
                        fontWeight: 'normal'
                      },
                      punctuation: { 
                        color: isDarkMode ? '#abb2bf' : '#24292e'  // Dark gray
                      }
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '0 1rem',
                      background: 'transparent',
                      fontSize: '14px',
                      lineHeight: '21px',
                      fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                      minHeight: '100%',
                      width: '100%'
                    }}
                    showLineNumbers={false}
                    wrapLines={true}
                  >
                    {code}
                  </SyntaxHighlighter>
                </pre>
              </div>
            </div>
          </div>
          {!terminalVisible && (
            <div className="absolute bottom-4 right-4 z-[9999]">
              <button
                onClick={() => setTerminalVisible(true)}
                className={`${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} p-2 rounded-full shadow-lg flex items-center justify-center`}
                title="Show Terminal"
              >
                <Terminal size={20} />
              </button>
            </div>
          )}
          {terminalVisible && (
            <div className="flex flex-col">
              <div
                className={`h-1 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} cursor-row-resize transition-colors`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  isDraggingRef.current = true;
                  isDraggingSidebarRef.current = false;
                }}
              />
              <div style={{ height: terminalHeight }} className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`flex items-center px-4 py-2 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                  <Terminal size={16} className="mr-2" />
                  <span className="text-sm">Terminal</span>
                  <div className="ml-auto flex gap-2">
                    <button 
                      onClick={() => {
                        setOutput('');
                        setTimeout(() => editorRef.current?.focus(), 10);
                      }} 
                      className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} p-1 rounded`} 
                      title="Clear"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setTerminalVisible(false);
                        setTimeout(() => editorRef.current?.focus(), 10);
                      }} 
                      className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} p-1 rounded`} 
                      title="Close Terminal"
                    >
                      <Terminal size={14} />
                    </button>
                  </div>
                </div>
                <div className={`p-4 font-mono text-sm h-full overflow-y-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {error ? (
                    <div className="text-red-400">{error}</div>
                  ) : output ? (
                    <pre className="whitespace-pre-wrap">{output}</pre>
                  ) : (
                    <div className="text-gray-500">
                      {isLoading ? 'Loading Pyodide...' : 'Ready'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
        multiple
        accept=".py,.json"
      />
      {showNewFileDialog && (
        <NewFileDialog
          onClose={() => { 
            setShowNewFileDialog(false);
            window.focusEditor && window.focusEditor(); 
            // setTimeout(() => editorRef.current?.focus(), 10);
          }}
          existingFiles={Object.keys(files)}
          onCreate={(newFileName: string) => {
            const initialContent = `# ${newFileName}\n# Created: ${new Date().toLocaleDateString()}\n\n# Add your code below\n`;
            setFiles((prev) => ({
              ...prev,
              [newFileName]: initialContent,
            }));
            setActiveFile(newFileName);
            setCode(initialContent);
            setTimeout(() => editorRef.current?.focus(), 10);
          }}
        />
      )}
      {showRenameDialog && (
        <RenameFileDialog
          onClose={() => { 
            setShowRenameDialog(false); 
            setTimeout(() => editorRef.current?.focus(), 10);
          }}
          onRename={(oldName, newName) => {
            if (oldName === newName) return;
            setFiles((prev) => {
              const newFiles = { ...prev };
              newFiles[newName] = newFiles[oldName];
              delete newFiles[oldName];
              return newFiles;
            });
            if (activeFile === oldName) {
              setActiveFile(newName);
            }
            setTimeout(() => editorRef.current?.focus(), 10);
          }}
          existingFiles={Object.keys(files)}
          currentName={fileToRename}
        />
      )}
      {showDeleteDialog && (
        <DeleteFileDialog
          onClose={() => { 
            setShowDeleteDialog(false);
            setTimeout(() => editorRef.current?.focus(), 10);
          }}
          onDelete={handleConfirmDelete}
          fileName={deleteFileName}
        />
      )}
    </div>
  );
};

export default CodeEditor;
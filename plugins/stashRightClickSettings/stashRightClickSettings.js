(async function() {
    'use strict';
	
    // Load Toastify CSS and JS
    const toastifyCSS = document.createElement('link');
    toastifyCSS.rel = 'stylesheet';
    toastifyCSS.href = 'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.css';
    document.head.appendChild(toastifyCSS);

    const toastifyScript = document.createElement('script');
    toastifyScript.src = 'https://cdn.jsdelivr.net/npm/toastify-js@1.12.0/src/toastify.min.js';
    document.head.appendChild(toastifyScript);

    // Wait for Toastify to load before using it
    toastifyScript.onload = function() {

        // Function to fetch plugin tasks
        async function fetchPluginTasks() {
            const query = `
                query PluginTasks {
                    pluginTasks {
                        plugin {
                            name
                            id
                        }
                        name
                    }
                }
            `;
            try {
                const response = await graphqlRequest(query);
                return response.data.pluginTasks;
            } catch (error) {
                console.error('Error fetching plugin tasks:', error);
                return [];
            }
        }

        // Function to run plugin task
        async function runPluginTask(pluginID) {
            const mutation = `
                mutation RunPluginTask($pluginID: ID!) {
                    runPluginTask(plugin_id: $pluginID)
                }
            `;
            try {
                const response = await graphqlRequest(mutation, { pluginID });
                return response.data.runPluginTask;
            } catch (error) {
                console.error('Error running plugin task:', error);
                return null;
            }
        }

        // Function to delete scene
        async function deleteScene(sceneID, deleteGenerated = false, deleteFile = false) {
            const mutation = `
                mutation SceneDestroy($id: ID!, $deleteGenerated: Boolean!, $deleteFile: Boolean!) {
                    sceneDestroy(input: { id: $id, delete_generated: $deleteGenerated, delete_file: $deleteFile })
                }
            `;
            try {
                const response = await graphqlRequest(mutation, { id: sceneID, deleteGenerated, deleteFile });
                return response.data.sceneDestroy;
            } catch (error) {
                console.error('Error deleting scene:', error);
                return null;
            }
        }

        // Function to format file size
        function formatFileSize(size) {
            if (size >= 1000000000) {
                return (size / 1000000000).toFixed(2) + ' GB';
            } else {
                return (size / 1000000).toFixed(2) + ' MB';
            }
        }

        // Function to convert seconds to hours and minutes
        function formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }

        function displayResultsInModal(duplicates, flaggedScenes, duplicateTitles, totalSize) {
			const modal = document.createElement('div');
			modal.id = 'settings-duplicate-modal';
		
			const modalContent = document.createElement('div');
			modalContent.className = 'settings-duplicate-modal-content';
		
			const header = document.createElement('div');
			header.className = 'settings-custom-modal-header';
			header.innerHTML = `
				<span>Review Results</span><br>
				<span>Total Scene Pairings: ${duplicateTitles.length}</span>
			`;
			modalContent.appendChild(header);
		
			const closeButton = document.createElement('span');
			closeButton.className = 'settings-custom-close';
			closeButton.innerHTML = '&times;';
			closeButton.onclick = () => {
				modal.style.display = 'none';
				modal.remove();
			};
		
			modalContent.appendChild(closeButton);
		
			if (duplicates.length > 0) {
				const duplicateHeader = document.createElement('div');
				duplicateHeader.className = 'settings-custom-plugin-header';
				duplicateHeader.textContent = 'Duplicate Files';
				modalContent.appendChild(duplicateHeader);
		
				duplicates.forEach((pair, index) => {
					if (index % 2 === 0) {
						const rowDiv = document.createElement('div');
						rowDiv.className = 'settings-comparison-row';
						modalContent.appendChild(rowDiv);
					}
		
					const rowDiv = modalContent.lastElementChild;
		
					const originalSize = pair.original.files[0].size;
					const duplicateSize = pair.duplicate.files[0].size;
		
					const originalDiv = document.createElement('div');
					originalDiv.className = `settings-custom-scene ${originalSize < duplicateSize ? 'settings-highlight' : ''}`;
					originalDiv.innerHTML = `
						<div class="settings-scene-details">
							<strong>Original Scene:</strong><br>
							<img src="${pair.original.scene.paths.screenshot}" alt="Original Scene Screenshot">
							<div class="settings-scene-info">
								<strong>Title:</strong> ${pair.original.scene.title} (ID: ${pair.original.scene.id})<br>
								<strong class="file-size">Size:</strong> ${formatFileSize(originalSize)}<br>
								<strong>Date:</strong> ${pair.original.scene.date}<br>
								<strong>Created At:</strong> ${pair.original.scene.created_at}<br>
								<strong>Updated At:</strong> ${pair.original.scene.updated_at}
							</div>
							<div class="settings-file-details">
								<strong>Files:</strong>
								<ul>
									${pair.original.files.map(file => `
										<li>
											<strong>Path:</strong> ${file.path}<br>
											<strong>Size:</strong> ${formatFileSize(file.size)}<br>
											<strong>Width:</strong> ${file.width}<br>
											<strong>Height:</strong> ${file.height}<br>
											<strong>Duration:</strong> ${formatDuration(file.duration)}<br>
											<strong>Fingerprint:</strong> ${file.fingerprints.map(fp => `${fp.type}: ${fp.value}`).join(', ')}
										</li>
									`).join('')}
								</ul>
							</div>
							<button data-id="${pair.original.scene.id}" data-deletegenerated="true" data-deletefile="false" class="settings-delete-scene">Delete Scene and Generated Files</button>
							<button data-id="${pair.original.scene.id}" data-deletegenerated="true" data-deletefile="true" class="settings-delete-scene">Delete Scene, Generated Files, and Local File</button>
						</div>
					`;
					rowDiv.appendChild(originalDiv);
		
					const duplicateDiv = document.createElement('div');
					duplicateDiv.className = `settings-custom-scene ${duplicateSize < originalSize ? 'settings-highlight' : ''}`;
					duplicateDiv.innerHTML = `
						<div class="settings-scene-details">
							<strong>Duplicate Scene:</strong><br>
							<img src="${pair.duplicate.scene.paths.screenshot}" alt="Duplicate Scene Screenshot">
							<div class="settings-scene-info">
								<strong>Title:</strong> ${pair.duplicate.scene.title} (ID: ${pair.duplicate.scene.id})<br>
								<strong class="file-size">Size:</strong> ${formatFileSize(duplicateSize)}<br>
								<strong>Date:</strong> ${pair.duplicate.scene.date}<br>
								<strong>Created At:</strong> ${pair.duplicate.scene.created_at}<br>
								<strong>Updated At:</strong> ${pair.duplicate.scene.updated_at}
							</div>
							<div class="settings-file-details">
								<strong>Files:</strong>
								<ul>
									${pair.duplicate.files.map(file => `
										<li>
											<strong>Path:</strong> ${file.path}<br>
											<strong>Size:</strong> ${formatFileSize(file.size)}<br>
											<strong>Width:</strong> ${file.width}<br>
											<strong>Height:</strong> ${file.height}<br>
											<strong>Duration:</strong> ${formatDuration(file.duration)}<br>
											<strong>Fingerprint:</strong> ${file.fingerprints.map(fp => `${fp.type}: ${fp.value}`).join(', ')}
										</li>
									`).join('')}
								</ul>
							</div>
							<button data-id="${pair.duplicate.scene.id}" data-deletegenerated="true" data-deletefile="false" class="settings-delete-scene">Delete Scene and Generated Files</button>
							<button data-id="${pair.duplicate.scene.id}" data-deletegenerated="true" data-deletefile="true" class="settings-delete-scene">Delete Scene, Generated Files, and Local File</button>
						</div>
					`;
					rowDiv.appendChild(duplicateDiv);
				});
			}

            if (flaggedScenes.length > 0) {
                const flaggedHeader = document.createElement('div');
                flaggedHeader.className = 'settings-custom-plugin-header';
                flaggedHeader.textContent = 'Scenes with No Files';
                modalContent.appendChild(flaggedHeader);

                flaggedScenes.forEach(scene => {
                    const sceneDiv = document.createElement('div');
                    sceneDiv.className = 'settings-custom-scene';
                    sceneDiv.innerHTML = `
                        <p>Scene ID: ${scene.id}</p>
                        <p>Title: ${scene.title}</p>
                        <button data-id="${scene.id}" data-deletegenerated="true" data-deletefile="false" class="settings-delete-scene">Delete Scene and Generated Files</button>
                        <button data-id="${scene.id}" data-deletegenerated="true" data-deletefile="true" class="settings-delete-scene">Delete Scene, Generated Files, and Local File</button>
                    `;
                    modalContent.appendChild(sceneDiv);
                });
            }

            if (duplicateTitles.length > 0) {
                const titleHeader = document.createElement('div');
                titleHeader.className = 'settings-custom-plugin-header';
                titleHeader.textContent = 'Duplicate Scene Titles';
                modalContent.appendChild(titleHeader);

                duplicateTitles.forEach((pair, index) => {
                    if (index % 2 === 0) {
                        const rowDiv = document.createElement('div');
                        rowDiv.className = 'settings-comparison-row';
                        modalContent.appendChild(rowDiv);
                    }

                    const rowDiv = modalContent.lastElementChild;

                    const isOriginalSmaller = pair.original.files[0].size < pair.duplicate.files[0].size;

                    const originalDiv = document.createElement('div');
                    originalDiv.className = `settings-custom-scene ${isOriginalSmaller ? 'settings-highlight' : ''}`;
                    originalDiv.innerHTML = `
                        <div class="settings-scene-details">
                            <strong>Original Scene:</strong><br>
                            <img src="${pair.original.paths.screenshot}" alt="Original Scene Screenshot">
                            <div class="settings-scene-info">
                                <strong>Title:</strong> ${pair.original.title} (ID: ${pair.original.id})<br>
                                <strong class="file-size ${isOriginalSmaller ? 'settings-highlight' : ''}">Size:</strong> ${formatFileSize(pair.original.files[0].size)}<br>
                                <strong>Date:</strong> ${pair.original.date}<br>
                                <strong>Created At:</strong> ${pair.original.created_at}<br>
                                <strong>Updated At:</strong> ${pair.original.updated_at}
                            </div>
                            <div class="settings-file-details">
                                <strong>Files:</strong>
                                <ul>
                                    ${pair.original.files.map(file => `
                                        <li>
                                            <strong>Path:</strong> ${file.path}<br>
                                            <strong>Size:</strong> ${formatFileSize(file.size)}<br>
                                            <strong>Width:</strong> ${file.width}<br>
                                            <strong>Height:</strong> ${file.height}<br>
                                            <strong>Duration:</strong> ${formatDuration(file.duration)}<br>
                                            <strong>Fingerprint:</strong> ${file.fingerprints.map(fp => `${fp.type}: ${fp.value}`).join(', ')}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <button data-id="${pair.original.id}" data-deletegenerated="true" data-deletefile="false" class="settings-delete-scene">Delete Scene and Generated Files</button>
                            <button data-id="${pair.original.id}" data-deletegenerated="true" data-deletefile="true" class="settings-delete-scene">Delete Scene, Generated Files, and Local File</button>
                        </div>
                    `;
                    rowDiv.appendChild(originalDiv);

                    const duplicateDiv = document.createElement('div');
                    duplicateDiv.className = `settings-custom-scene ${!isOriginalSmaller ? 'settings-highlight' : ''}`;
                    duplicateDiv.innerHTML = `
                        <div class="settings-scene-details">
                            <strong>Duplicate Scene:</strong><br>
                            <img src="${pair.duplicate.paths.screenshot}" alt="Duplicate Scene Screenshot">
                            <div class="settings-scene-info">
                                <strong>Title:</strong> ${pair.duplicate.title} (ID: ${pair.duplicate.id})<br>
                                <strong class="file-size ${!isOriginalSmaller ? 'settings-highlight' : ''}">Size:</strong> ${formatFileSize(pair.duplicate.files[0].size)}<br>
                                <strong>Date:</strong> ${pair.duplicate.date}<br>
                                <strong>Created At:</strong> ${pair.duplicate.created_at}<br>
                                <strong>Updated At:</strong> ${pair.duplicate.updated_at}
                            </div>
                            <div class="settings-file-details">
                                <strong>Files:</strong>
                                <ul>
                                    ${pair.duplicate.files.map(file => `
                                        <li>
                                            <strong>Path:</strong> ${file.path}<br>
                                            <strong>Size:</strong> ${formatFileSize(file.size)}<br>
                                            <strong>Width:</strong> ${file.width}<br>
                                            <strong>Height:</strong> ${file.height}<br>
                                            <strong>Duration:</strong> ${formatDuration(file.duration)}<br>
                                            <strong>Fingerprint:</strong> ${file.fingerprints.map(fp => `${fp.type}: ${fp.value}`).join(', ')}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                            <button data-id="${pair.duplicate.id}" data-deletegenerated="true" data-deletefile="false" class="settings-delete-scene">Delete Scene and Generated Files</button>
                            <button data-id="${pair.duplicate.id}" data-deletegenerated="true" data-deletefile="true" class="settings-delete-scene">Delete Scene, Generated Files, and Local File</button>
                        </div>
                    `;
                    rowDiv.appendChild(duplicateDiv);
                });
            }

            modal.appendChild(modalContent);
			document.body.appendChild(modal);
		
			modal.style.display = 'block';
		
			// Attach delete scene event listeners
			modal.querySelectorAll('.settings-delete-scene').forEach(button => {
				button.addEventListener('click', async (e) => {
					const sceneID = e.target.getAttribute('data-id');
					const deleteGenerated = e.target.getAttribute('data-deletegenerated') === 'true';
					const deleteFile = e.target.getAttribute('data-deletefile') === 'true';
					const result = await deleteScene(sceneID, deleteGenerated, deleteFile);
					if (result) {
						e.target.closest('.settings-custom-scene').remove();
						Toastify({
							text: 'Scene deleted successfully',
							backgroundColor: 'green',
							position: "center",
							duration: 3000
						}).showToast();
					} else {
						Toastify({
							text: 'Failed to delete scene',
							backgroundColor: 'red',
							position: "center",
							duration: 3000
						}).showToast();
					}
				});
			});
		
			window.onclick = (event) => {
				if (event.target == modal) {
					modal.style.display = 'none';
					modal.remove();
				}
			};
		}

        // Function to check for duplicate files and scenes with no files
        async function checkDuplicateFiles() {
            const query = `
                query AllScenes {
                    allScenes {
                        id
                        title
                        date
                        created_at
                        updated_at
                        files {
                            path
                            size
                            fingerprints {
                                type
                                value
                            }
                            width
                            height
                            duration
                        }
                        paths {
                            screenshot
                        }
                        stash_ids {
                            endpoint
                            stash_id
                        }
                    }
                }
            `;
            try {
                const response = await graphqlRequest(query);
                const scenes = response.data.allScenes;
                const fileMap = new Map();
                const titleMap = new Map();
                const duplicates = [];
                const duplicateTitles = [];
                const flaggedScenes = [];
                let totalSize = 0;

                scenes.forEach(scene => {
                    // Check for scenes with no files
                    if (scene.files.length === 0) {
                        flaggedScenes.push(scene);
                    }

                    // Check for duplicate file fingerprints
                    scene.files.forEach(file => {
                        const fingerprint = file.fingerprints.find(fp => fp.type === 'SHA-256');
                        if (fingerprint) {
                            if (fileMap.has(fingerprint.value)) {
                                const originalFile = fileMap.get(fingerprint.value);
                                duplicates.push({
                                    original: {
                                        scene,
                                        files: [originalFile]
                                    },
                                    duplicate: {
                                        scene,
                                        files: [file]
                                    }
                                });
                                totalSize += file.size + originalFile.size;
                            } else {
                                fileMap.set(fingerprint.value, file);
                            }
                        }
                    });

                    // Check for duplicate titles, excluding scenes with no title
                    if (scene.title && titleMap.has(scene.title)) {
                        duplicateTitles.push({
                            original: titleMap.get(scene.title),
                            duplicate: scene
                        });
                    } else if (scene.title) {
                        titleMap.set(scene.title, scene);
                    }
                });

                if (duplicates.length > 0 || flaggedScenes.length > 0 || duplicateTitles.length > 0) {
                    displayResultsInModal(duplicates, flaggedScenes, duplicateTitles, totalSize);
                } else {
                    alert('No issues found.');
                }
            } catch (error) {
                console.error('Error checking duplicate files:', error);
                alert('Error checking duplicate files. Check the console for details.');
            }
        }

        // Function to create the custom menu
        function createCustomMenu(event) {
            const menu = document.createElement('div');
            menu.id = 'settings-custom-menu';

            const runPluginTaskLink = document.createElement('a');
            runPluginTaskLink.href = '#';
            runPluginTaskLink.textContent = 'Run Plugin Task...';
            runPluginTaskLink.addEventListener('click', async function(e) {
                e.preventDefault();
                menu.remove();
                await showSettingsCustomModal();
            });
            menu.appendChild(runPluginTaskLink);

            const editCSSLink = document.createElement('a');
            editCSSLink.href = '#';
            editCSSLink.textContent = 'Edit CSS...';
            editCSSLink.addEventListener('click', function(e) {
                e.preventDefault();
                menu.remove();
                editCustomCSS();
            });
            menu.appendChild(editCSSLink);

            const editJavaScriptLink = document.createElement('a');
            editJavaScriptLink.href = '#';
            editJavaScriptLink.textContent = 'Edit JavaScript...';
            editJavaScriptLink.addEventListener('click', function(e) {
                e.preventDefault();
                menu.remove();
                editCustomJavaScript();
            });
            menu.appendChild(editJavaScriptLink);

            const duplicateCheckerLink = document.createElement('a');
            duplicateCheckerLink.href = '#';
            duplicateCheckerLink.textContent = 'Duplicate Checker...';
            duplicateCheckerLink.addEventListener('click', async function(e) {
                e.preventDefault();
                menu.remove();
                await checkDuplicateFiles();
            });
            menu.appendChild(duplicateCheckerLink);

            // Add Support link at the bottom of the menu
            const supportLink = document.createElement('a');
            supportLink.href = 'https://www.patreon.com/serechops/membership';
            supportLink.textContent = 'Support';
            supportLink.target = '_blank'; // Open in a new tab
            supportLink.style.marginTop = '10px';
            supportLink.style.color = '#FFD700';
            menu.appendChild(supportLink);

            document.body.appendChild(menu);

            // Adjust menu position to align to the left of the cursor
            const menuWidth = menu.offsetWidth;
            const menuLeft = event.pageX - menuWidth;
            const menuTop = event.pageY;

            menu.style.top = `${menuTop}px`;
            menu.style.left = `${menuLeft}px`;

            const handleClickOutside = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', handleClickOutside);
                }
            };

            document.addEventListener('click', handleClickOutside);
        }

        // Function to handle right-click on the settings button
        document.addEventListener('contextmenu', function(event) {
            const settingsButton = event.target.closest('button[title="Settings"]');
            if (settingsButton) {
                event.preventDefault();
                createCustomMenu(event);
            }
        });

        // GraphQL request function
        async function graphqlRequest(query, variables = {}) {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, variables })
            });
            return response.json();
        }

        // Function to show the custom modal for plugin tasks
        async function showSettingsCustomModal() {
            const tasks = await fetchPluginTasks();
            const modal = document.createElement('div');
            modal.id = 'settings-custom-modal';

            const modalContent = document.createElement('div');
            modalContent.className = 'settings-custom-modal-content';

            const header = document.createElement('div');
            header.className = 'settings-custom-modal-header';
            header.textContent = 'Select a Task';
            modalContent.appendChild(header);

            const closeButton = document.createElement('span');
            closeButton.className = 'settings-custom-close';
            closeButton.innerHTML = '&times;';
            closeButton.onclick = () => {
                modal.style.display = 'none';
                modal.remove();
            };

            modalContent.appendChild(closeButton);

            // Group tasks by plugin
            const plugins = {};
            tasks.forEach(task => {
                if (!plugins[task.plugin.id]) {
                    plugins[task.plugin.id] = {
                        name: task.plugin.name,
                        tasks: []
                    };
                }
                plugins[task.plugin.id].tasks.push(task);
            });

            // Sort plugins alphabetically by name
            const sortedPlugins = Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name));

            // Create plugin headers and task lists
            sortedPlugins.forEach(plugin => {
                const pluginHeader = document.createElement('div');
                pluginHeader.className = 'settings-custom-plugin-header';
                pluginHeader.textContent = plugin.name;
                modalContent.appendChild(pluginHeader);

                const taskList = document.createElement('div');
                taskList.className = 'settings-custom-task-list';

                plugin.tasks.forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'settings-custom-task';
                    taskDiv.textContent = task.name;
                    taskDiv.onclick = async () => {
                        const result = await runPluginTask(task.plugin.id);
                        if (result) {
                            Toastify({
                                text: 'Task ran successfully',
                                backgroundColor: 'green',
                                position: "center",
                                duration: 3000
                            }).showToast();
                        } else {
                            Toastify({
                                text: 'Failed to run task',
                                backgroundColor: 'red',
                                position: "center",
                                duration: 3000
                            }).showToast();
                        }
                    };
                    taskList.appendChild(taskDiv);
                });

                modalContent.appendChild(taskList);
            });

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            modal.style.display = 'block';

            window.onclick = (event) => {
                if (event.target == modal) {
                    modal.style.display = 'none';
                    modal.remove();
                }
            };
        }

        // Function to mimic clicking the "Edit" button for Custom CSS
        function editCustomCSS() {
            const editButton = document.querySelector('#custom-css .btn-primary');
            if (editButton) {
                editButton.click();
            } else {
                Toastify({
                    text: 'Custom CSS Edit button not found',
                    backgroundColor: 'red',
                    position: "center",
                    duration: 3000
                }).showToast();
            }
        }

        // Function to mimic clicking the "Edit" button for Custom JavaScript
        function editCustomJavaScript() {
            const editButton = document.querySelector('#custom-javascript .btn-primary');
            if (editButton) {
                editButton.click();
            } else {
                Toastify({
                    text: 'Custom JavaScript Edit button not found',
                    backgroundColor: 'red',
                    position: "center",
                    duration: 3000
                }).showToast();
            }
        }

    };

})();

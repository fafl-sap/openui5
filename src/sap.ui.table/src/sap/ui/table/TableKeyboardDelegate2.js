/*!
 * ${copyright}
 */

// Provides helper sap.ui.table.TableKeyboardDelegate2.
sap.ui.define(['jquery.sap.global', 'sap/ui/base/Object', './library', './TableExtension', './TableUtils'],
	function(jQuery, BaseObject, library, TableExtension, TableUtils) {
	"use strict";

	// Shortcuts
	var CellType = TableUtils.CELLTYPES;
	var SelectionMode = library.SelectionMode;

	// Workaround until (if ever) these values can be set by applications.
	var HORIZONTAL_SCROLLING_PAGE_SIZE = 5;
	var COLUMN_RESIZE_STEP_CSS_SIZE = "1em";

	/**
	 * New Delegate for keyboard events of sap.ui.table.Table controls.
	 *
	 * @class Delegate for keyboard events of sap.ui.table.Table controls.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version ${version}
	 * @constructor
	 * @private
	 * @alias sap.ui.table.TableKeyboardDelegate2
	 */
	var TableKeyboardDelegate = BaseObject.extend("sap.ui.table.TableKeyboardDelegate2", /* @lends sap.ui.table.TableKeyboardDelegate2 */ {

		constructor : function(sType) { BaseObject.call(this); },

		/*
		 * @see sap.ui.base.Object#destroy
		 */
		destroy : function() { BaseObject.prototype.destroy.apply(this, arguments); },

		/*
		 * @see sap.ui.base.Object#getInterface
		 */
		getInterface : function() { return this; }

	});

	/*
	 * Restores the focus to the last known cell position.
	 */
	TableKeyboardDelegate._restoreFocusOnLastFocusedDataCell = function(oTable, oEvent) {
		var oCellInfo = TableUtils.getFocusedItemInfo(oTable);
		var oLastInfo = oTable._getKeyboardExtension()._getLastFocusedCellInfo();
		TableUtils.focusItem(oTable, oCellInfo.cellInRow + (oCellInfo.columnCount * oLastInfo.row), oEvent);
	};

	/*
	 * Sets the focus to the correspondig column header of the last known cell position.
	 */
	TableKeyboardDelegate._setFocusOnColumnHeaderOfLastFocusedDataCell = function(oTable, oEvent) {
		var oCellInfo = TableUtils.getFocusedItemInfo(oTable);
		TableUtils.focusItem(oTable, oCellInfo.cellInRow, oEvent);
	};

	/*
	 * Sets the focus to the correspondig column header of the last known cell position.
	 */
	TableKeyboardDelegate._forwardFocusToTabDummy = function(oTable, sTabDummy) {
		oTable._getKeyboardExtension()._setSilentFocus(oTable.$().find("." + sTabDummy));
	};

	/*
	 * Handler which is called when the Space or Enter keys are pressed.
	 */
	TableKeyboardDelegate._handleSpaceAndEnter = function(oTable, oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		// Open column menu.
		if (oCellInfo.type === CellType.COLUMNHEADER) {
			oTable._bShowMenu = true;
			oTable._onSelect(oEvent);
			oTable._bShowMenu = false;

		// Select/Deselect all.
		} else if (oCellInfo.type === CellType.COLUMNROWHEADER) {
			oTable._toggleSelectAll();

		// Collapse/Expand group.
		} else if (TableUtils.isInGroupingRow(oEvent.target)) {
			TableUtils.toggleGroupHeader(oTable, oEvent.target);

		// Select/Deselect row.
		} else if (oCellInfo.type === CellType.ROWHEADER) {
			TableUtils.toggleRowSelection(oTable, oEvent.target);

		} else if (oCellInfo.type === CellType.DATACELL) {

			// Select/Deselect row.
			if (TableUtils.isRowSelectionAllowed(oTable)) {
				TableUtils.toggleRowSelection(oTable, oEvent.target);

			// Fire cell click event.
			} else if (oTable._findAndfireCellEvent(oTable.fireCellClick, oEvent) !== false) {
				// CellClick event handler exists and was called.

			// Enter action mode.
			} else {
				var $InteractiveElements = TableUtils.getInteractiveElements(oEvent.target);
				if ($InteractiveElements !== null) {
					$InteractiveElements[0].focus();
				}
			}
		}
	};

	//******************************************************************************************

	/*
	 * Hook which is called by the keyboard extension when the table should enter the action mode.
	 * @see TableKeyboardExtension#setActionMode
	 */
	TableKeyboardDelegate.prototype.enterActionMode = function() {
		this._getKeyboardExtension()._suspendItemNavigation();
		return true;
	};

	/*
	 * Hook which is called by the keyboard extension when the table should leave the action mode.
	 * @see TableKeyboardExtension#setActionMode
	 */
	TableKeyboardDelegate.prototype.leaveActionMode = function() {
		this._getKeyboardExtension()._resumeItemNavigation();
	};

	TableKeyboardDelegate.prototype.onfocusin = function(oEvent) {
		if (oEvent.isMarked("sapUiTableIgnoreFocusIn")) {
			return;
		}

		var $Target = jQuery(oEvent.target);

		if ($Target.hasClass("sapUiTableOuterBefore") || $Target.hasClass("sapUiTableOuterAfter")
			|| (oEvent.target != this.getDomRef("overlay") && this.getShowOverlay())) {
			this.$("overlay").focus();

		} else if ($Target.hasClass("sapUiTableCtrlBefore")) {
			var bNoData = TableUtils.isNoDataVisible(this);
			if (!bNoData || bNoData && this.getColumnHeaderVisible()) {
				TableKeyboardDelegate._setFocusOnColumnHeaderOfLastFocusedDataCell(this, oEvent);
			} else {
				this._getKeyboardExtension()._setSilentFocus(this.$("noDataCnt"));
			}

		} else if ($Target.hasClass("sapUiTableCtrlAfter")) {
			if (!TableUtils.isNoDataVisible(this)) {
				TableKeyboardDelegate._restoreFocusOnLastFocusedDataCell(this, oEvent);
			}/* else {
				 // If needed and NoData visible, then set the focus to NoData area.
				 this.$("noDataCnt").focus();
			 }*/
		}

		// Enter the action mode if a tabbable element inside a cell or the footer received focus, otherwise leave the action mode.
		var $Target = jQuery(oEvent.target);
		var $ParentDataCell = TableUtils.getParentDataCell(this, $Target);

		if ($ParentDataCell !== null && $Target.is(":sapFocusable")) {
			if (!this._getKeyboardExtension().isInActionMode()) {
				this._getKeyboardExtension().setActionMode(true);
			}
		} else {
			if (this._getKeyboardExtension().isInActionMode()) {
				this._getKeyboardExtension().setActionMode(false);
			}
		}
	};

	TableKeyboardDelegate.prototype.onkeydown = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		// Start the range selection mode.
		if (oEvent.keyCode === jQuery.sap.KeyCodes.SHIFT
			&& this.getSelectionMode() === SelectionMode.MultiToggle
			&& (oCellInfo.type === CellType.ROWHEADER && TableUtils.isRowSelectorSelectionAllowed(this)
				|| oCellInfo.type === CellType.DATACELL && TableUtils.isRowSelectionAllowed(this))) {

			var iFocusedRowIndex = TableUtils.getRowIndexOfFocusedCell(this);
			var iDataRowIndex = this.getRows()[iFocusedRowIndex].getIndex();

			/**
			 * Contains information that are used when the range selection mode is active.
			 * If this property is undefined the range selection mode is not active.
			 * @type {{startIndex: int, selected: boolean}}
			 * @property {int} startIndex The index of the data row in which the selection mode was activated.
			 * @property {boolean} selected True, if the data row in which the selection mode was activated is selected.
			 * @private
			 */
			this._oRangeSelection = {
				startIndex: iDataRowIndex,
				selected: this.isIndexSelected(iDataRowIndex)
			};

		// Select/Deselect all.
		} else if ((oEvent.metaKey || oEvent.ctrlKey) && oEvent.keyCode === jQuery.sap.KeyCodes.A) {
			oEvent.preventDefault(); // To prevent full page text selection.

			if ((oCellInfo.type === CellType.DATACELL ||
				oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.COLUMNROWHEADER)
				&& this.getSelectionMode() === SelectionMode.MultiToggle) {

				this._toggleSelectAll();
			}

		// Toggle the action mode by changing the focus between a data cell and its interactive controls.
		} else if (oEvent.keyCode === jQuery.sap.KeyCodes.F2) {

			// Enter action mode.
			var $InteractiveElements = TableUtils.getInteractiveElements(oEvent.target);
			if ($InteractiveElements !== null) {
				$InteractiveElements[0].focus();

			// Leave action mode.
			} else {
				var $ParentDataCell = TableUtils.getParentDataCell(this, oEvent.target);
				if ($ParentDataCell !== null) {
					$ParentDataCell.focus();
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onkeyup = function(oEvent) {
		// End the range selection mode.
		if (oEvent.keyCode === jQuery.sap.KeyCodes.SHIFT) {
			delete this._oRangeSelection;
		}

		if (oEvent.keyCode === jQuery.sap.KeyCodes.SPACE && !oEvent.shiftKey) {
			oEvent.preventDefault(); // To prevent the browser window to scroll down.
			TableKeyboardDelegate._handleSpaceAndEnter(this, oEvent);
		}
	};

	TableKeyboardDelegate.prototype.onsaptabnext = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.COLUMNHEADER ||
			oCellInfo.type === CellType.COLUMNROWHEADER) {

			if (TableUtils.isNoDataVisible(this)) {
				this.$("noDataCnt").focus();
			} else {
				TableKeyboardDelegate._restoreFocusOnLastFocusedDataCell(this, oEvent);
			}

			oEvent.preventDefault();

		} else if (oCellInfo.type === CellType.DATACELL ||
				   oCellInfo.type === CellType.ROWHEADER) {
			TableKeyboardDelegate._forwardFocusToTabDummy(this, "sapUiTableCtrlAfter");

		} else if (oEvent.target === this.getDomRef("overlay")) {
			this._getKeyboardExtension()._setSilentFocus(this.$().find(".sapUiTableOuterAfter"));
		}
	};

	TableKeyboardDelegate.prototype.onsaptabprevious = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL  ||
			oCellInfo.type === CellType.ROWHEADER ||
			oEvent.target === this.getDomRef("noDataCnt")) {

			if (this.getColumnHeaderVisible()) {
				TableKeyboardDelegate._setFocusOnColumnHeaderOfLastFocusedDataCell(this, oEvent);
				oEvent.preventDefault();
			} else {
				TableKeyboardDelegate._forwardFocusToTabDummy(this, "sapUiTableCtrlBefore");
			}

		} else if (oEvent.target === this.getDomRef("overlay")) {
			this._getKeyboardExtension()._setSilentFocus(this.$().find(".sapUiTableOuterBefore"));
		}
	};

	TableKeyboardDelegate.prototype.onsapdown = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.ROWHEADER) {

			if (TableUtils.isLastScrollableRow(this, oEvent.target)) {
				var bScrolled = TableUtils.scroll(this, true, false);
				if (bScrolled) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}
			}

		} else if (oCellInfo.type === CellType.COLUMNHEADER ||
				   oCellInfo.type === CellType.COLUMNROWHEADER) {

			var iHeaderRowCount = TableUtils.getHeaderRowCount(this);

			if (TableUtils.isNoDataVisible(this)) {
				var oFocusInfo = TableUtils.getFocusedItemInfo(this);
				if (oFocusInfo.row - iHeaderRowCount <= 1) { // We are in the last column header row
					//Just prevent the navigation to the table content
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}

			} else if (oCellInfo.type === CellType.COLUMNROWHEADER && iHeaderRowCount > 1) {
				//Special logic needed because row selector added multiple times into the item navigation
				oEvent.setMarked("sapUiTableSkipItemNavigation");
				//Focus the first row header
				TableUtils.focusItem(this, iHeaderRowCount * (TableUtils.getVisibleColumnCount(this) + 1/*Row Headers*/), oEvent);
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapdownmodifiers = function(oEvent) {
		if (oEvent.shiftKey) {
			oEvent.preventDefault(); // To avoid text selection flickering.

			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.DATACELL) {

				// Navigation should not be possible if we are not in range selection mode.
				if (!this._oRangeSelection) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
					return;
				}

				var iFocusedRowIndex = TableUtils.getRowIndexOfFocusedCell(this);
				var iDataRowIndex = this.getRows()[iFocusedRowIndex].getIndex();

				// If we are in the last data row of the table we don't need to do anything.
				if (iDataRowIndex === this._getRowCount() - 1) {
					return;
				}

				if (TableUtils.isLastScrollableRow(this, oEvent.target)) {
					var bScrolled = TableUtils.scroll(this, true, false);
					if (bScrolled) {
						oEvent.setMarked("sapUiTableSkipItemNavigation");
					}
				}

				if (this._oRangeSelection.startIndex <= iDataRowIndex) {
					iDataRowIndex++;
					if (this._oRangeSelection.selected) {
						TableUtils.toggleRowSelection(this, iDataRowIndex, true);
					} else {
						TableUtils.toggleRowSelection(this, iDataRowIndex, false);
					}
				} else {
					// When moving back down to the row where the range selection started, the rows always get deselected.
					TableUtils.toggleRowSelection(this, iDataRowIndex, false);
				}

			} else {
				oEvent.setMarked("sapUiTableSkipItemNavigation");
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapup = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.ROWHEADER) {

			if (TableUtils.isFirstScrollableRow(this, oEvent.target)) {
				var bScrolled = TableUtils.scroll(this, false, false);
				if (bScrolled) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapupmodifiers = function(oEvent) {
		if (oEvent.shiftKey) {
			oEvent.preventDefault(); // To avoid text selection flickering.

			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.DATACELL) {

				// Navigation should not be possible if we are not in range selection mode.
				if (!this._oRangeSelection) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
					return;
				}

				var iFocusedRowIndex = TableUtils.getRowIndexOfFocusedCell(this);
				var iDataRowIndex = this.getRows()[iFocusedRowIndex].getIndex();

				// Do not move up to the header when performing a range selection.
				if (iDataRowIndex === 0) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
					return;
				}

				if (TableUtils.isFirstScrollableRow(this, oEvent.target)) {
					var bScrolled = TableUtils.scroll(this, false, false);
					if (bScrolled) {
						oEvent.setMarked("sapUiTableSkipItemNavigation");
					}
				}

				if (this._oRangeSelection.startIndex >= iDataRowIndex) {
					iDataRowIndex--;
					if (this._oRangeSelection.selected) {
						TableUtils.toggleRowSelection(this, iDataRowIndex, true);
					} else {
						TableUtils.toggleRowSelection(this, iDataRowIndex, false);
					}
				} else {
					// When moving back up to the row where the range selection started, the rows always get deselected.
					TableUtils.toggleRowSelection(this, iDataRowIndex, false);
				}

			} else {
				oEvent.setMarked("sapUiTableSkipItemNavigation");
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapleftmodifiers = function(oEvent) {
		if (oEvent.shiftKey) {
			oEvent.preventDefault(); // To avoid text selection flickering.

			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};
			var bIsRTL = sap.ui.getCore().getConfiguration().getRTL();

			/* Range Selection */

			if (oCellInfo.type === CellType.DATACELL) {
				// Navigation should not be possible if we are not in range selection mode.
				if (!this._oRangeSelection) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
					return;
				}

				var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
				var bFocusOnFirstDataCell = TableUtils.hasRowHeader(this) && oFocusedItemInfo.cellInRow === 1;

				// If selection on row headers is not possible, then do not allow to move focus to them when performing a range selection.
				if (bFocusOnFirstDataCell && !TableUtils.isRowSelectorSelectionAllowed(this)) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}

			/* Range Selection: Required for RTL mode. */

			} else if (oCellInfo.type === CellType.ROWHEADER && bIsRTL) {
				// If selection on rows is not possible, then do not allow to move focus to them when performing a range selection.
				if (!TableUtils.isRowSelectionAllowed(this)) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}

			} else if (oCellInfo.type === CellType.COLUMNROWHEADER && bIsRTL) {
				oEvent.setMarked("sapUiTableSkipItemNavigation");

			/* Column Resizing */

			} else if (oCellInfo.type === CellType.COLUMNHEADER) {
				var iResizeDelta = -this._CSSSizeToPixel(COLUMN_RESIZE_STEP_CSS_SIZE);
				if (bIsRTL) {
					iResizeDelta = iResizeDelta * -1;
				}

				var oColumnHeaderInfo = TableUtils.getColumnHeaderCellInfo(oEvent.target);
				var iColumnSpanWidth = 0;

				for (var i = oColumnHeaderInfo.index; i < oColumnHeaderInfo.index + oColumnHeaderInfo.span; i++) {
					iColumnSpanWidth += TableUtils.getColumnWidth(this, i);
				}

				TableUtils.resizeColumn(this, oColumnHeaderInfo.index, iColumnSpanWidth + iResizeDelta, true, oColumnHeaderInfo.span);

				oEvent.setMarked("sapUiTableSkipItemNavigation");
			}
		}
	};

	TableKeyboardDelegate.prototype.onsaprightmodifiers = function(oEvent) {
		if (oEvent.shiftKey) {
			oEvent.preventDefault(); // To avoid text selection flickering.

			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			/* Range Selection */

			if (oCellInfo.type === CellType.DATACELL) {
				// Navigation should not be possible if we are not in range selection mode.
				if (!this._oRangeSelection) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}

			} else if (oCellInfo.type === CellType.ROWHEADER) {
				// If selection on data cells is not possible, then do not allow to move focus to them when performing a range selection.
				if (!TableUtils.isRowSelectionAllowed(this)) {
					oEvent.setMarked("sapUiTableSkipItemNavigation");
				}

			/* Column Resizing */

			} else if (oCellInfo.type === CellType.COLUMNHEADER) {
				var iResizeDelta = this._CSSSizeToPixel(COLUMN_RESIZE_STEP_CSS_SIZE);
				if (sap.ui.getCore().getConfiguration().getRTL()) {
					iResizeDelta = iResizeDelta * -1;
				}

				var oColumnHeaderInfo = TableUtils.getColumnHeaderCellInfo(oEvent.target);
				var iColumnSpanWidth = 0;

				for (var i = oColumnHeaderInfo.index; i < oColumnHeaderInfo.index + oColumnHeaderInfo.span; i++) {
					iColumnSpanWidth += TableUtils.getColumnWidth(this, i);
				}

				TableUtils.resizeColumn(this, oColumnHeaderInfo.index, iColumnSpanWidth + iResizeDelta, true, oColumnHeaderInfo.span);

				oEvent.setMarked("sapUiTableSkipItemNavigation");

			} else if (oCellInfo.type === CellType.COLUMNROWHEADER) {
				oEvent.setMarked("sapUiTableSkipItemNavigation");
			}
		}
	};

	TableKeyboardDelegate.prototype.onsaphome = function(oEvent) {
		// If focus is on a group header, do nothing.
		if (TableUtils.isInGroupingRow(oEvent.target)) {
			oEvent.setMarked("sapUiTableSkipItemNavigation");
			return;
		}

		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.COLUMNHEADER) {

			var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
			var iFocusedIndex = oFocusedItemInfo.cell;
			var iFocusedCellInRow = oFocusedItemInfo.cellInRow;

			var bHasRowHeader = TableUtils.hasRowHeader(this);
			var iRowHeaderOffset = bHasRowHeader ? 1 : 0;

			if (TableUtils.hasFixedColumns(this) && iFocusedCellInRow > this.getFixedColumnCount() + iRowHeaderOffset) {
				// If there is a fixed column area and the focus is to the right of the first cell in the non-fixed area,
				// then set the focus to the first cell in the non-fixed area.
				oEvent.setMarked("sapUiTableSkipItemNavigation");
				TableUtils.focusItem(this, iFocusedIndex - iFocusedCellInRow + this.getFixedColumnCount() + iRowHeaderOffset, null);

			} else if (bHasRowHeader && iFocusedCellInRow > 1) {
				// If there is a row header column and the focus is after the first content column,
				// then set the focus to the cell in the first content column.
				oEvent.setMarked("sapUiTableSkipItemNavigation");
				TableUtils.focusItem(this, iFocusedIndex - iFocusedCellInRow + iRowHeaderOffset, null);
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapend = function(oEvent) {
		// If focus is on a group header, do nothing.
		if (TableUtils.isInGroupingRow(oEvent.target)) {
			oEvent.setMarked("sapUiTableSkipItemNavigation");
			return;
		}

		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.ROWHEADER ||
			oCellInfo.type === CellType.COLUMNHEADER ||
			oCellInfo.type === CellType.COLUMNROWHEADER) {

			var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
			var iFocusedIndex = oFocusedItemInfo.cell;
			var iFocusedCellInRow = oFocusedItemInfo.cellInRow;

			var bHasRowHeader = TableUtils.hasRowHeader(this);
			var iRowHeaderOffset = bHasRowHeader ? 1 : 0;
			var bIsColSpanAtFixedAreaEnd = false;

			// If the focused cell is a column span in the column header at the end of the fixed area,
			// the selected cell index is the index of the first cell in the span.
			// Treat this case like there is no span and the last cell of the fixed area is selected.
			if (oCellInfo.type === CellType.COLUMNHEADER && TableUtils.hasFixedColumns(this)) {
				var iColSpan = oCellInfo.cell.data('sap-ui-colspan');
				if (iColSpan > 1 && iFocusedCellInRow + iColSpan - iRowHeaderOffset === this.getFixedColumnCount()) {
					bIsColSpanAtFixedAreaEnd = true;
				}
			}

			if (bHasRowHeader && iFocusedCellInRow === 0) {
				// If there is a row header and it has the focus,
				// then set the focus to the cell in the next column.
				oEvent.setMarked("sapUiTableSkipItemNavigation");
				TableUtils.focusItem(this, iFocusedIndex + 1, null);

			} else if (TableUtils.hasFixedColumns(this)
					&& iFocusedCellInRow < this.getFixedColumnCount() - 1 + iRowHeaderOffset && !bIsColSpanAtFixedAreaEnd) {
				// If there is a fixed column area and the focus is not on its last cell or column span,
				// then set the focus to the last cell of the fixed column area.
				oEvent.setMarked("sapUiTableSkipItemNavigation");
				TableUtils.focusItem(this, iFocusedIndex + this.getFixedColumnCount() - iFocusedCellInRow, null);
			}
		}
	};

	TableKeyboardDelegate.prototype.onsaphomemodifiers = function(oEvent) {
		if (oEvent.metaKey || oEvent.ctrlKey) {
			oEvent.preventDefault(); // To prevent the browser page from scrolling to the top.
			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.DATACELL ||
				oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.COLUMNHEADER) {

				oEvent.setMarked("sapUiTableSkipItemNavigation");

				var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
				var iFocusedRow = oFocusedItemInfo.row;

				// Only do something if the focus is not in the first row already.
				if (iFocusedRow > 0) {
					var iFocusedIndex = oFocusedItemInfo.cell;
					var iColumnCount = oFocusedItemInfo.columnCount;
					var iHeaderRowCount = TableUtils.getHeaderRowCount(this);

					/* Column header area */
					/* Top fixed area */
					if (iFocusedRow < iHeaderRowCount + this.getFixedRowCount()) {
						// Set the focus to the first row of the top fixed area.
						TableUtils.focusItem(this, iFocusedIndex - iColumnCount * iFocusedRow, oEvent);

					/* Scrollable area */
					} else if (iFocusedRow >= iHeaderRowCount + this.getFixedRowCount()
							&& iFocusedRow < iHeaderRowCount + TableUtils.getNonEmptyVisibleRowCount(this) - this.getFixedBottomRowCount()) {
						TableUtils.scrollMax(this, false);
						// If a fixed top area exists, then set the focus to the first row of the top fixed area,
						// otherwise set the focus to the first row of the column header area.
						if (this.getFixedRowCount() > 0) {
							TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount), oEvent);
						} else {
							TableUtils.focusItem(this, iFocusedIndex - iColumnCount * iFocusedRow, oEvent);
						}

					/* Bottom fixed area */
					} else {
						// Set the focus to the first row of the scrollable area and scroll to top.
						TableUtils.scrollMax(this, false);
						TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount - this.getFixedRowCount()), oEvent);
					}
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapendmodifiers = function(oEvent) {
		if (oEvent.metaKey || oEvent.ctrlKey) {
			oEvent.preventDefault(); // To prevent the browser page from scrolling to the bottom.
			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.DATACELL ||
				oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.COLUMNHEADER ||
				oCellInfo.type === CellType.COLUMNROWHEADER) {

				oEvent.setMarked("sapUiTableSkipItemNavigation");

				var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
				var iFocusedRow = oFocusedItemInfo.row;
				var iHeaderRowCount = TableUtils.getHeaderRowCount(this);
				var iNonEmptyVisibleRowCount = TableUtils.getNonEmptyVisibleRowCount(this);

				// Only do something if the focus is above the last row of the fixed bottom area
				// or above the last row of the column header area when NoData is visible.
				if (this.getFixedBottomRowCount() === 0
						|| iFocusedRow < iHeaderRowCount + iNonEmptyVisibleRowCount - 1
						|| (TableUtils.isNoDataVisible(this) && iFocusedRow < iHeaderRowCount - 1)) {
					var iFocusedIndex = oFocusedItemInfo.cell;
					var iColumnCount = oFocusedItemInfo.columnCount;

					/* Column header area */
					if (TableUtils.isNoDataVisible(this)) {
						// Set the focus to the last row of the column header area.
						TableUtils.focusItem(this, iFocusedIndex + iColumnCount * (iHeaderRowCount - iFocusedRow - 1), oEvent);
					} else if (iFocusedRow < iHeaderRowCount) {
						// If a top fixed area exists, then set the focus to the last row of the top fixed area,
						// otherwise set the focus to the last row of the scrollable area and scroll to bottom.
						if (this.getFixedRowCount() > 0) {
							TableUtils.focusItem(this, iFocusedIndex
								+ iColumnCount * (iHeaderRowCount + this.getFixedRowCount() - iFocusedRow - 1), oEvent);
						} else {
							TableUtils.scrollMax(this, true);
							TableUtils.focusItem(this, iFocusedIndex
								+ iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount() - iFocusedRow - 1), oEvent);
						}

					/* Top fixed area */
					} else if (iFocusedRow >= iHeaderRowCount
							&& iFocusedRow < iHeaderRowCount + this.getFixedRowCount()) {
						// Set the focus to the last row of the scrollable area and scroll to bottom.
						TableUtils.scrollMax(this, true);
						TableUtils.focusItem(this, iFocusedIndex
							+ iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount() - iFocusedRow - 1), oEvent);

					/* Scrollable area */
					} else if (iFocusedRow >= iHeaderRowCount + this.getFixedRowCount()
							&& iFocusedRow < iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount()) {
						// Set the focus to the last row of the scrollable area and scroll to bottom.
						TableUtils.scrollMax(this, true);
						TableUtils.focusItem(this, iFocusedIndex
							+ iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - iFocusedRow - 1), oEvent);

					/* Bottom fixed area */
					} else {
						// Set the focus to the last row of the bottom fixed area.
						TableUtils.focusItem(this, iFocusedIndex
							+ iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - iFocusedRow - 1), oEvent);
					}
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsappageup = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.ROWHEADER ||
			oCellInfo.type === CellType.COLUMNHEADER) {

			var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
			var iFocusedRow = oFocusedItemInfo.row;
			var iHeaderRowCount = TableUtils.getHeaderRowCount(this);

			// Only do something if the focus is not in the column header area or the first row of the top fixed area.
			if (this.getFixedRowCount() === 0 && iFocusedRow >= iHeaderRowCount || this.getFixedRowCount() > 0 && iFocusedRow > iHeaderRowCount) {
				oEvent.setMarked("sapUiTableSkipItemNavigation");

				var iFocusedIndex = oFocusedItemInfo.cell;
				var iColumnCount = oFocusedItemInfo.columnCount;

				/* Top fixed area - From second row downwards */
				if (iFocusedRow < iHeaderRowCount + this.getFixedRowCount()) {
					// Set the focus to the first row of the top fixed area.
					TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount), oEvent);

				/* Scrollable area - First row */
				} else if (iFocusedRow === iHeaderRowCount + this.getFixedRowCount()) {
					var iPageSize = TableUtils.getNonEmptyVisibleRowCount(this) - this.getFixedRowCount() - this.getFixedBottomRowCount();
					var iRowsToBeScrolled = this._getSanitizedFirstVisibleRow();

					TableUtils.scroll(this, false, true); // Scroll up one page

					// Only change the focus if scrolling was not performed over a full page, or not at all.
					if (iRowsToBeScrolled < iPageSize) {
						// If a fixed top area exists, then set the focus to the first row of the top fixed area,
						// otherwise set the focus to the first row of the column header area.
						if (this.getFixedRowCount() > 0) {
							TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount), oEvent);
						} else {
							TableUtils.focusItem(this, iFocusedIndex - iColumnCount * iHeaderRowCount, oEvent);
						}
					}

				/* Scrollable area - From second row downwards */
				/* Bottom Fixed area */
				} else if (iFocusedRow > iHeaderRowCount + this.getFixedRowCount()
						&& iFocusedRow < iHeaderRowCount + TableUtils.getNonEmptyVisibleRowCount(this)) {
					// Set the focus to the first row of the scrollable area.
					TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount - this.getFixedRowCount()), oEvent);

				/* Empty area */
				} else {
					// Set the focus to the last row of the scrollable area.
					TableUtils.focusItem(this, iFocusedIndex - iColumnCount * (iFocusedRow - iHeaderRowCount - TableUtils.getNonEmptyVisibleRowCount(this) + 1), oEvent);
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsappagedown = function(oEvent) {
		var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

		if (oCellInfo.type === CellType.DATACELL ||
			oCellInfo.type === CellType.ROWHEADER ||
			oCellInfo.type === CellType.COLUMNHEADER ||
			oCellInfo.type === CellType.COLUMNROWHEADER) {

			oEvent.setMarked("sapUiTableSkipItemNavigation");

			var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
			var iFocusedRow = oFocusedItemInfo.row;
			var iHeaderRowCount = TableUtils.getHeaderRowCount(this);
			var iNonEmptyVisibleRowCount = TableUtils.getNonEmptyVisibleRowCount(this);

			// Only do something if the focus is above the last row of the bottom fixed area
			// or above the last row of the column header area when NoData is visible.
			if ((TableUtils.isNoDataVisible(this) && iFocusedRow < iHeaderRowCount - 1)
					|| this.getFixedBottomRowCount() === 0
					|| iFocusedRow < iHeaderRowCount + iNonEmptyVisibleRowCount - 1) {
				var iFocusedIndex = oFocusedItemInfo.cell;
				var iColumnCount = oFocusedItemInfo.columnCount;

				/* Column header area - From second-last row upwards */
				if (iFocusedRow < iHeaderRowCount - 1 && oCellInfo.type !== CellType.COLUMNROWHEADER) {
					// Set the focus to the last row of the column header area.
					TableUtils.focusItem(this, iFocusedIndex + iColumnCount * (iHeaderRowCount - iFocusedRow - 1), oEvent);

				/* Column header area - Last row */
				} else if (iFocusedRow < iHeaderRowCount) {
					// If the NoData area is visible, then do nothing,
					// otherwise set the focus to the first row of the top fixed (if existing) or scrollable area.
					if (!TableUtils.isNoDataVisible(this)) {
						TableUtils.focusItem(this, iFocusedIndex + iColumnCount * (iHeaderRowCount - iFocusedRow), oEvent);
					}

				/* Top fixed area */
				/* Scrollable area - From second-last row upwards */
				} else if (iFocusedRow >= iHeaderRowCount
						&& iFocusedRow < iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount() - 1) {
					// Set the focus to the last row of the scrollable area.
					TableUtils.focusItem(this, iFocusedIndex
						+ iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount() - iFocusedRow - 1), oEvent);

				/* Scrollable area - Last row */
				} else if (iFocusedRow === iHeaderRowCount + iNonEmptyVisibleRowCount - this.getFixedBottomRowCount() - 1) {
					var iPageSize = TableUtils.getNonEmptyVisibleRowCount(this) - this.getFixedRowCount() - this.getFixedBottomRowCount();
					var iRowsToBeScrolled = this._getRowCount() - this.getFixedBottomRowCount() - this._getSanitizedFirstVisibleRow() - iPageSize * 2;

					TableUtils.scroll(this, true, true); // Scroll down one page

					// If scrolling was not performed over a full page and there is a bottom fixed area,
					// then set the focus to the last row of the bottom fixed area.
					if (iRowsToBeScrolled < iPageSize && this.getFixedBottomRowCount() > 0) {
						TableUtils.focusItem(this, iFocusedIndex + iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - iFocusedRow - 1), oEvent);
					}

				/* Bottom fixed area */
				} else {
					// Set the focus to the last row of the bottom fixed area.
					TableUtils.focusItem(this, iFocusedIndex + iColumnCount * (iHeaderRowCount + iNonEmptyVisibleRowCount - iFocusedRow - 1), oEvent);
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsappageupmodifiers = function(oEvent) {
		if (oEvent.altKey) {
			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.DATACELL ||
				oCellInfo.type === CellType.COLUMNHEADER) {

				var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
				var iFocusedIndex = oFocusedItemInfo.cell;
				var iFocusedCellInRow = oFocusedItemInfo.cellInRow;

				var bHasRowHeader = TableUtils.hasRowHeader(this);
				var iRowHeaderOffset = bHasRowHeader ? 1 : 0;
				var iPageSize = HORIZONTAL_SCROLLING_PAGE_SIZE;

				oEvent.setMarked("sapUiTableSkipItemNavigation");

				if (bHasRowHeader && (TableUtils.isInGroupingRow(oEvent.target) || iFocusedCellInRow === 1)) {
					// If a row header exists and the focus is on a group header or the first cell,
					// then set the focus to the row header cell.
					TableUtils.focusItem(this, iFocusedIndex - iFocusedCellInRow, null);

				} else if (iFocusedCellInRow - iRowHeaderOffset < iPageSize) {
					// If scrolling can not be performed over a full page,
					// then scroll only the remaining cells (set the focus to the first cell).
					TableUtils.focusItem(this, iFocusedIndex - iFocusedCellInRow + iRowHeaderOffset, null);

				} else {
					// Scroll one page.
					TableUtils.focusItem(this, iFocusedIndex - iPageSize, null);
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsappagedownmodifiers = function(oEvent) {
		if (oEvent.altKey) {
			var oCellInfo = TableUtils.getCellInfo(oEvent.target) || {};

			if (oCellInfo.type === CellType.DATACELL ||
				oCellInfo.type === CellType.ROWHEADER ||
				oCellInfo.type === CellType.COLUMNHEADER ||
				oCellInfo.type === CellType.COLUMNROWHEADER) {

				var oFocusedItemInfo = TableUtils.getFocusedItemInfo(this);
				var iFocusedCellInRow = oFocusedItemInfo.cellInRow;

				var bHasRowHeader = TableUtils.hasRowHeader(this);
				var iRowHeaderOffset = bHasRowHeader ? 1 : 0;
				var iVisibleColumnCount = TableUtils.getVisibleColumnCount(this);
				var iColSpan = oCellInfo.cell.data('sap-ui-colspan') || 1;

				oEvent.setMarked("sapUiTableSkipItemNavigation");

				// Only do something, if the selected cell or span is not at the end of the table.
				if (iFocusedCellInRow + iColSpan - iRowHeaderOffset < iVisibleColumnCount) {
					var iFocusedIndex = oFocusedItemInfo.cell;
					var iPageSize = HORIZONTAL_SCROLLING_PAGE_SIZE;

					if (bHasRowHeader && iFocusedCellInRow === 0) {
						// If there is a row header and it has the focus,
						// then set the focus to the first cell.
						TableUtils.focusItem(this, iFocusedIndex + 1, null);

					} else if (iColSpan > iPageSize) {
						// If the focused cell is a column span bigger than a page size,
						// then set the focus the the next column in the row.
						TableUtils.focusItem(this, iFocusedIndex + iColSpan, null);

					} else if (iFocusedCellInRow + iColSpan - iRowHeaderOffset + iPageSize > iVisibleColumnCount) {
						// If scrolling can not be performed over a full page,
						// then scroll only the remaining cells (set the focus to the last cell).
						TableUtils.focusItem(this, iFocusedIndex + iVisibleColumnCount - iFocusedCellInRow - 1 + iRowHeaderOffset, null);

					} else if (!TableUtils.isInGroupingRow(oEvent.target)) {
						// Scroll one page.
						TableUtils.focusItem(this, iFocusedIndex + iPageSize, null);
					}
				}
			}
		}
	};

	TableKeyboardDelegate.prototype.onsapenter = function(oEvent) {
		TableKeyboardDelegate._handleSpaceAndEnter(this, oEvent);
	};

	return TableKeyboardDelegate;
});
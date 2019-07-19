/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, ElementRef, EventEmitter, Injector, Output} from '@angular/core';
import {AbstractComponent} from '../../common/component/abstract.component';
import * as _ from "lodash";
import {StringUtil} from "../../common/util/string.util";
import {Metadata, SourceType} from "../../domain/meta-data-management/metadata";
import {ExploreDataConstant} from "../constant/explore-data-constant";
import {MetadataService} from "../../meta-data-management/metadata/service/metadata.service";
import {CommonConstant} from "../../common/constant/common.constant";
import {ExploreDataModelService} from "./service/explore-data-model.service";
import {StorageService} from "../../data-storage/service/storage.service";
import {ConstantService} from "../../shared/datasource-metadata/service/constant.service";
import {CommonUtil} from "../../common/util/common.util";
import {Catalog} from "../../domain/catalog/catalog";

@Component({
  selector: 'explore-data-list',
  templateUrl: './explore-data-list.component.html',
})
export class ExploreDataListComponent extends AbstractComponent {

  metadataList: Metadata[];

  // only used in UI
  selectedLnbTab: ExploreDataConstant.LnbTab;
  searchRange;
  searchedKeyword: string;
  selectedCatalog: Catalog.Tree;
  selectedTag;

  // filters
  // TODO 추후 동적필터가 들어오게되면 제거 필요
  dataTypeFilterList = StorageService.isEnableStageDB ? this.constant.getMetadataTypeFilters() : this.constant.getMetadataTypeFiltersExceptStaging();
  selectedDataTypeFilter;

  // event
  @Output() readonly clickedMetadata = new EventEmitter();
  @Output() readonly requestInitializeSelectedCatalog = new EventEmitter();
  @Output() readonly requestInitializeSelectedTag = new EventEmitter();

  // 생성자
  constructor(private metadataService: MetadataService,
              private exploreDataModelService: ExploreDataModelService,
              private constant: ConstantService,
              protected element: ElementRef,
              protected injector: Injector) {
    super(element, injector);
  }

  initMetadataList(): void {
    // set external data
    this.selectedLnbTab = this.exploreDataModelService.selectedLnbTab;
    this.searchRange = this.exploreDataModelService.selectedSearchRange;
    this.searchedKeyword = this.exploreDataModelService.searchKeyword;
    this.selectedCatalog = this.exploreDataModelService.selectedCatalog;
    this.selectedTag = this.exploreDataModelService.selectedTag;
    // initial metadata list
    this._initialMetadataList();
  }

  isEmptyMetadataList(): boolean {
    return _.isNil(this.metadataList) || this.metadataList.length === 0;
  }

  isEnableTag(metadata: Metadata): boolean {
    return !Metadata.isEmptyTags(metadata);
  }

  isEnableDescription(metadata: Metadata): boolean {
    return StringUtil.isNotEmpty(metadata.description);
  }

  isNotEmptySearchKeyword(): boolean {
    return StringUtil.isNotEmpty(this.searchedKeyword);
  }

  isSelectedCatalog(): boolean {
    return this.selectedLnbTab === ExploreDataConstant.LnbTab.CATALOG && !_.isNil(this.selectedCatalog);
  }

  isSelectedTag(): boolean {
    return this.selectedLnbTab === ExploreDataConstant.LnbTab.TAG && !_.isNil(this.selectedTag);
  }

  getTotalElements(): string {
    return CommonUtil.numberWithCommas(this.pageResult.totalElements);
  }

  getTotalElementsGuide() {
    if (this.isNotEmptySearchKeyword()) {
      return this.translateService.instant('msg.explore.ui.list.content.total.searched', {totalElements: this.getTotalElements(), searchedKeyword: this.searchedKeyword.trim()});
    } else {
      return this.translateService.instant('msg.explore.ui.list.content.total', {totalElements: this.getTotalElements()});
    }
  }

  getMetadataName(name: string) {
    if (this.isNotEmptySearchKeyword() && (this.searchRange.value === ExploreDataConstant.SearchRange.ALL || this.searchRange.value === ExploreDataConstant.SearchRange.DATA_NAME)) {
      return name.replace(this.searchedKeyword, `<span class="ddp-txt-search type-search">${this.searchedKeyword}</span>`);
    } else {
      return name;
    }
  }

  getMetadataDescription(description: string) {
    if (this.isNotEmptySearchKeyword() && (this.searchRange.value === ExploreDataConstant.SearchRange.ALL || this.searchRange.value === ExploreDataConstant.SearchRange.DESCRIPTION)) {
      return '-' + description.replace(this.searchedKeyword, `<span class="ddp-txt-search type-search">${this.searchedKeyword}</span>`);
    } else {
      return '-' + description;
    }
  }

  getMetadataCreator(creator: string) {
    if (this.isNotEmptySearchKeyword() && (this.searchRange.value === ExploreDataConstant.SearchRange.ALL || this.searchRange.value === ExploreDataConstant.SearchRange.CREATOR)) {
      return creator.replace(this.searchedKeyword, `<span class="ddp-txt-search type-search">${this.searchedKeyword}</span>`);
    } else {
      return creator;
    }
  }

  getConvertedMetadataType(sourceType: SourceType) {
    switch (sourceType) {
      case SourceType.ENGINE:
        return this.translateService.instant('msg.comm.th.ds');
      case SourceType.JDBC:
        return this.translateService.instant('msg.storage.li.db');
      case SourceType.STAGEDB:
        return this.translateService.instant('msg.storage.li.hive');
    }
  }

  /**
   * More connection click event
   */
  changePage(data: { page: number, size: number }): void {
    // if more metadata list
    if (data) {
      this.page.page = data.page;
      this.page.size = data.size;
      this._setMetadataList(this._getMetadataListParams());
    }
  }

  onClickMetadata(metadata: Metadata): void {
    this.clickedMetadata.emit(metadata);
  }

  onClickResetSelectedCatalog(): void {
    // requesting lnb component to initialize catalog
    this.requestInitializeSelectedCatalog.emit();
  }

  onClickResetSelectedTag(): void {
    // requesting lnb component to initialize tag
    this.requestInitializeSelectedTag.emit();
  }

  private _getMetadataListParams() {
    const result = {
      page: this.page.page,
      size: this.page.size,
    };
    // if not empty search keyword
    if (StringUtil.isNotEmpty(this.searchedKeyword)) {
      result[this.searchRange.value] = this.searchedKeyword.trim();
    }
    if (this.isSelectedCatalog()) {
      result['catalogId'] = this.selectedCatalog.id;
    } else if (this.isSelectedTag()) {
      result['tag'] = this.selectedTag.name;
    }
    return result;
  }

  private _setMetadataList(params) {
    this.loadingShow();
    this.metadataService.getMetaDataList(params)
      .then((result) => {

        this.pageResult = result.page;

        if (result._embedded) {
          this.metadataList = result._embedded.metadatas;
        } else {
          this.metadataList = [];
        }
        this.loadingHide();
      })
      .catch(error => this.commonExceptionHandler(error));
  }

  private _initialMetadataList(): void {
    this.page.page = 0;
    this.page.size = CommonConstant.API_CONSTANT.PAGE_SIZE;
    this._setMetadataList(this._getMetadataListParams());
  }
}

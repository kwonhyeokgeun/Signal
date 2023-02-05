package com.ssafysignal.api.project.service;

import com.ssafysignal.api.admin.Entity.BlackUser;
import com.ssafysignal.api.admin.Repository.BlackUserRepository;
import com.ssafysignal.api.apply.entity.Apply;
import com.ssafysignal.api.apply.repository.ApplyRepository;
import com.ssafysignal.api.common.entity.ImageFile;
import com.ssafysignal.api.common.repository.ImageFileRepository;
import com.ssafysignal.api.common.service.FileService;
import com.ssafysignal.api.global.exception.NotFoundException;
import com.ssafysignal.api.global.response.ResponseCode;
import com.ssafysignal.api.project.dto.reponse.ProjectApplyDto;
import com.ssafysignal.api.project.dto.reponse.ProjectSettingFindResponse;
import com.ssafysignal.api.project.dto.reponse.ProjectUserFindAllDto;
import com.ssafysignal.api.project.dto.request.ProjectEvaluationRegistRequest;
import com.ssafysignal.api.project.dto.request.ProjectSettingModifyRequest;
import com.ssafysignal.api.project.entity.*;
import com.ssafysignal.api.project.repository.ProjectEvaluationRepository;
import com.ssafysignal.api.project.repository.ProjectPositionRepository;
import com.ssafysignal.api.project.repository.ProjectRepository;
import com.ssafysignal.api.project.repository.ProjectUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectSettingService {

    private final ProjectRepository projectRepository;
    private final ProjectUserRepository projectUserRepository;
    private final ProjectEvaluationRepository projectEvaluationRepository;
    private final ProjectPositionRepository projectPositionRepository;
    private final BlackUserRepository blackUserRepository;
    private final ImageFileRepository imageFileRepository;
    private final FileService fileService;

    @Transactional(readOnly = true)
    public ProjectSettingFindResponse findProjectSetting(Integer projectSeq) {
        Project project = projectRepository.findById(projectSeq)
                .orElseThrow(() -> new NotFoundException(ResponseCode.NOT_FOUND));

        return ProjectSettingFindResponse.fromEntity(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectUserFindAllDto> findProjectUser(Integer projectSeq) {
        List<ProjectUser> projectUserList = projectUserRepository.findByProjectSeq(projectSeq);

        return projectUserList.stream()
                .map(ProjectUserFindAllDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Integer> findProjectUserEvaluation(Integer projectUserSeq, Integer termCnt) {
        projectUserRepository.findById(projectUserSeq)
                .orElseThrow(() -> new NotFoundException(ResponseCode.NOT_FOUND));

        List<ProjectEvaluation> projectEvaluationList = projectEvaluationRepository.findAll(ProjectSpecification.byFromUserSeq(projectUserSeq, termCnt));
        return projectEvaluationList.stream()
                .map(ProjectEvaluation::getToUserSeq)
                .distinct()
                .collect(Collectors.toList());
    }

    @Transactional
    public void modifyProjectSetting(Integer projectSeq, MultipartFile uploadImage, ProjectSettingModifyRequest projectSettingModifyRequest) throws RuntimeException, IOException {
        Project project = projectRepository.findById(projectSeq)
                .orElseThrow(() -> new NotFoundException(ResponseCode.MODIFY_NOT_FOUND));

        if (!uploadImage.isEmpty()){
            // 사진올리고
            fileService.registImageFile(uploadImage);
            if (project.getProjectImageFileSeq() != 1) {
                fileService.deleteImageFile(project.getImageFile().getUrl());
                imageFileRepository.deleteById(project.getProjectImageFileSeq());
            }
            Integer imageFileSeq = fileService.registImageFile(uploadImage);
            project.setProjectImageFileSeq(imageFileSeq);
        }
        /*
            프로젝트 설정 데이터 처리
         */
        project.setSubject(projectSettingModifyRequest.getSubject());
        project.setLocalCode(projectSettingModifyRequest.getLocalCode());
        project.setFieldCode(projectSettingModifyRequest.getFieldCode());
        project.setTerm(projectSettingModifyRequest.getTerm());
        project.setContact(projectSettingModifyRequest.isContact());
        project.setContent(projectSettingModifyRequest.getContent());
        project.setGitUrl(projectSettingModifyRequest.getGitUrl());
        projectRepository.save(project);
    }

    @Transactional
    public void deleteProjectUser(Integer projectUserSeq) throws RuntimeException {
        ProjectUser projectUser = projectUserRepository.findById(projectUserSeq)
                .orElseThrow(() -> new NotFoundException(ResponseCode.DELETE_NOT_FOUND));

        // 블랙리스트 등록
        blackUserRepository.save(BlackUser.builder()
                        .userSeq(projectUser.getUserSeq())
                        .projectSeq(projectUser.getProjectSeq())
                        .build());
        
        // 현재 프로젝트 인원에서 제거
        projectUserRepository.deleteById(projectUserSeq);
        
        // 포지션 인원 맞춤 (제거된 인원 포지션 -1)
        ProjectPosition projectPosition = projectPositionRepository.findByProjectSeqAndPositionCode(projectUser.getProjectSeq(), projectUser.getPositionCode())
                .orElseThrow(() -> new NotFoundException(ResponseCode.DELETE_NOT_FOUND));
        projectPosition.setPositionCnt(projectPosition.getPositionCnt() - 1);
        projectPositionRepository.save(projectPosition);
    }

    @Transactional
    public void registProjectUserEvaluation(ProjectEvaluationRegistRequest projectEvaluationRegistRequest) throws RuntimeException {
        // 이미 등록됬는지 확인
        if (projectEvaluationRepository.findAll(
                ProjectSpecification.byFromUserSeqAndToUserSeq(
                        projectEvaluationRegistRequest.getFromUserSeq(),
                        projectEvaluationRegistRequest.getToUserSeq(),
                        projectEvaluationRegistRequest.getTerm())).isEmpty()){

            for (Map<String, Integer> score : projectEvaluationRegistRequest.getScoreList()){

                projectEvaluationRepository.save(ProjectEvaluation.builder()
                        .projectSeq(projectEvaluationRegistRequest.getProjectSeq())
                        .fromUserSeq(projectEvaluationRegistRequest.getFromUserSeq())
                        .toUserSeq(projectEvaluationRegistRequest.getToUserSeq())
                        .termCnt(projectEvaluationRegistRequest.getTerm())
                        .num(score.get("num"))
                        .score(score.get("score"))
                        .build());
            }
        } else throw new NotFoundException(ResponseCode.REGIST_ALREADY);
    }
}

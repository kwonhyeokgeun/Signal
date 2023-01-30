package com.ssafysignal.api.project.entity;

import com.ssafysignal.api.posting.entity.Posting;
import com.ssafysignal.api.posting.entity.PostingSkill;
import org.springframework.data.jpa.domain.Specification;

import javax.persistence.criteria.Join;
import javax.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ProjectSpecification {
    public static Specification<Project> bySearchWord(Map<String, Object> searchKey){
        return ((root, query, criteriaBuilder) -> {
            Predicate projectList = criteriaBuilder.conjunction();

            if (searchKey.get("subject") != null) projectList = criteriaBuilder.and(projectList, criteriaBuilder.like(root.get("subject"), "%" + searchKey.get("subject") + "%"));
            if (searchKey.get("localCode") != null) projectList = criteriaBuilder.and(projectList, criteriaBuilder.like(root.get("localCode"), "%" + searchKey.get("localCode") + "%"));
            if (searchKey.get("fieldCode") != null) projectList = criteriaBuilder.and(projectList, criteriaBuilder.like(root.get("fieldCode"), "%" + searchKey.get("fieldCode") + "%"));
            if (searchKey.get("postingSkillList") != null) {
                List<String> skills = (ArrayList<String>) searchKey.get("postingSkillList");

                Join<Project, Posting> postingJoin = root.join("posting");
                Join<Posting, PostingSkill> postingSkillJoin = postingJoin.join("postingSkillList");
                projectList = criteriaBuilder.and(projectList, postingSkillJoin.get("skillCode").in(skills));
            }
            return projectList;
        });
    }

    public static Specification<Project> byUserSeq(Integer userSeq, String projectCode){
        return ((root, query, criteriaBuilder) -> {
            Predicate projectList = criteriaBuilder.conjunction();

            // 프로젝트 코드가 일치하고
            projectList = criteriaBuilder.and(projectList, criteriaBuilder.equal(root.get("projectCode"), projectCode));

            Join<Project, ProjectUser> projectUserJoin = root.join("projectUserList");
            projectList = criteriaBuilder.and(projectList, criteriaBuilder.equal(projectUserJoin.get("userSeq"), userSeq));

            return projectList;
        });
    }

    public static Specification<ProjectEvaluation> byFromUserSeq(Integer projectUserSeq, Integer termCnt){
        return ((root, query, criteriaBuilder) -> {
            Predicate projectUserList = criteriaBuilder.conjunction();
            projectUserList = criteriaBuilder.and(projectUserList, criteriaBuilder.equal(root.get("termCnt"), termCnt));
            projectUserList = criteriaBuilder.and(projectUserList, criteriaBuilder.equal(root.get("fromUserSeq"), projectUserSeq));
            return projectUserList;
        });
    }

    public static Specification<ProjectEvaluation> byFromUserSeqAndToUserSeq(Integer projectUserSeq, Integer toProjectUserSeq, Integer termCnt){
        return ((root, query, criteriaBuilder) -> {
            Predicate projectUserList = criteriaBuilder.conjunction();
            projectUserList = criteriaBuilder.and(projectUserList, criteriaBuilder.equal(root.get("termCnt"), termCnt));
            projectUserList = criteriaBuilder.and(projectUserList, criteriaBuilder.equal(root.get("fromUserSeq"), projectUserSeq));
            projectUserList = criteriaBuilder.and(projectUserList, criteriaBuilder.equal(root.get("toUserSeq"), toProjectUserSeq));

            return projectUserList;
        });
    }
}